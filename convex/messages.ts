import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";
import { requireNotModerated } from "./lib/moderationCheck";

// Internal: Get or create a conversation between two users
export const getOrCreateConversation = internalMutation({
  args: {
    participantOneId: v.id("users"),
    participantTwoId: v.id("users"),
  },
  returns: v.id("conversations"),
  handler: async (ctx, { participantOneId, participantTwoId }) => {
    if (participantOneId === participantTwoId) {
      throw new Error("Cannot create a conversation with oneself.");
    }

    // Sort participant IDs for consistent lookup
    const sortedParticipantIds = [participantOneId, participantTwoId].sort() as [
      Id<"users">,
      Id<"users">
    ];

    // Check for existing conversation
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_participant_time", (q) =>
        q.eq("participantSet", sortedParticipantIds)
      )
      .unique();

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      participantIds: sortedParticipantIds,
      participantSet: sortedParticipantIds,
      lastMessageTime: Date.now(),
    });

    return conversationId;
  },
});

// Start or get existing conversation with another user
export const startConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  returns: v.object({
    conversationId: v.id("conversations"),
    otherParticipant: v.object({
      _id: v.id("users"),
      name: v.string(),
      imageUrl: v.optional(v.string()),
      isOnline: v.optional(v.boolean()),
    }),
  }),
  handler: async (ctx, args) => {
    if (args.currentUserId === args.otherUserId) {
      throw new Error("Cannot start a conversation with yourself.");
    }

    const conversationId: Id<"conversations"> = await ctx.runMutation(
      internal.messages.getOrCreateConversation,
      {
        participantOneId: args.currentUserId,
        participantTwoId: args.otherUserId,
      }
    );

    // Get other user's info
    const otherUser = await ctx.db.get(args.otherUserId);
    if (!otherUser) {
      throw new Error("User not found");
    }

    // Get profile for display name
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.otherUserId))
      .unique();

    return {
      conversationId,
      otherParticipant: {
        _id: args.otherUserId,
        name: profile?.displayName ?? otherUser.name,
        imageUrl: otherUser.imageUrl,
        isOnline: otherUser.isOnline,
      },
    };
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    senderId: v.id("users"),
    receiverId: v.id("users"),
    content: v.string(),
    format: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("gif"),
      v.literal("location"),
      v.literal("album_share")
    ),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    // Check if user is banned or suspended
    await requireNotModerated(ctx, args.senderId);

    if (args.senderId === args.receiverId) {
      throw new Error("Cannot send a message to yourself.");
    }

    // Get or create conversation
    const conversationId: Id<"conversations"> = await ctx.runMutation(
      internal.messages.getOrCreateConversation,
      {
        participantOneId: args.senderId,
        participantTwoId: args.receiverId,
      }
    );

    const sentAt = Date.now();

    // Create message
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: args.senderId,
      content: args.content,
      format: args.format,
      storageId: args.storageId,
      sentAt,
    });

    // Update conversation
    await ctx.db.patch(conversationId, {
      lastMessageId: messageId,
      lastMessageTime: sentAt,
    });

    // Send push notification to receiver
    const notificationBody = args.format === "text"
      ? args.content.substring(0, 100)
      : args.format === "image" ? "Sent you a photo"
      : args.format === "video" ? "Sent you a video"
      : args.format === "gif" ? "Sent you a GIF"
      : args.format === "location" ? "Shared a location"
      : args.format === "album_share" ? "Shared an album with you"
      : "Sent you a message";

    await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
      recipientUserId: args.receiverId,
      title: "New Message",
      body: notificationBody,
      tag: `message-${conversationId}`,
      data: {
        type: "message" as const,
        conversationId,
        senderId: args.senderId,
        url: `/messages?conversation=${conversationId}`,
      },
    });

    return messageId;
  },
});

// Send message to existing conversation
export const sendMessageToConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    format: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("gif"),
      v.literal("location"),
      v.literal("album_share")
    ),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    // Check if user is banned or suspended
    await requireNotModerated(ctx, args.senderId);

    // Verify conversation exists and user is a participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participantIds.includes(args.senderId)) {
      throw new Error("You are not a participant in this conversation");
    }

    const sentAt = Date.now();

    // Create message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      format: args.format,
      storageId: args.storageId,
      sentAt,
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastMessageTime: sentAt,
    });

    // Find the recipient (other participant in the conversation)
    const recipientUserId = conversation.participantIds.find(
      (id) => id !== args.senderId
    );

    // Send push notification to recipient
    if (recipientUserId) {
      const notificationBody = args.format === "text"
        ? args.content.substring(0, 100)
        : args.format === "image" ? "Sent you a photo"
        : args.format === "video" ? "Sent you a video"
        : args.format === "gif" ? "Sent you a GIF"
        : args.format === "location" ? "Shared a location"
        : args.format === "album_share" ? "Shared an album with you"
        : "Sent you a message";

      await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
        recipientUserId,
        title: "New Message",
        body: notificationBody,
        tag: `message-${args.conversationId}`,
        data: {
          type: "message" as const,
          conversationId: args.conversationId,
          senderId: args.senderId,
          url: `/messages?conversation=${args.conversationId}`,
        },
      });
    }

    return messageId;
  },
});

// List messages in a conversation with pagination
export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Filter out hidden messages and enrich with sender info
    const messagesWithSenders = await Promise.all(
      result.page
        .filter((message) => !message.isHidden) // Filter hidden messages
        .map(async (message) => {
          const sender = await ctx.db.get(message.senderId);
          const senderProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", message.senderId))
            .unique();

          return {
            ...message,
            sender: {
              _id: message.senderId,
              name: senderProfile?.displayName ?? sender?.name ?? "Unknown",
              imageUrl: sender?.imageUrl,
            },
          };
        })
    );

    return {
      ...result,
      page: messagesWithSenders,
    };
  },
});

// List conversations for a user
export const listConversations = query({
  args: {
    userId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Get all conversations, ordered by last message time
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageTime")
      .order("desc")
      .collect();

    // Filter to only this user's conversations
    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.userId)
    );

    // Paginate manually
    const startIndex = 0;
    const endIndex = args.paginationOpts.numItems;
    const paginatedConversations = userConversations.slice(startIndex, endIndex);

    // Enrich with other participant info and last message
    const conversationsWithDetails = await Promise.all(
      paginatedConversations.map(async (conversation) => {
        // Find the other participant
        const otherParticipantId = conversation.participantIds.find(
          (id) => id !== args.userId
        );

        if (!otherParticipantId) return null;

        const otherUser = await ctx.db.get(otherParticipantId);
        if (!otherUser) return null;

        const otherProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherParticipantId))
          .unique();

        // Get last message
        let lastMessage = null;
        if (conversation.lastMessageId) {
          const message = await ctx.db.get(conversation.lastMessageId);
          if (message) {
            lastMessage = {
              _id: message._id,
              content: message.content,
              format: message.format,
              senderId: message.senderId,
              sentAt: message.sentAt,
            };
          }
        }

        // Count unread messages
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .filter((q) => q.neq(q.field("senderId"), args.userId))
          .collect();

        const unreadCount = unreadMessages.filter(
          (msg) => !msg.readAt || !msg.readAt[args.userId]
        ).length;

        return {
          _id: conversation._id,
          _creationTime: conversation._creationTime,
          lastMessageTime: conversation.lastMessageTime,
          lastMessage,
          otherParticipant: {
            _id: otherParticipantId,
            name: otherProfile?.displayName ?? otherUser.name,
            imageUrl: otherUser.imageUrl,
            isOnline: otherUser.isOnline,
          },
          unreadCount,
        };
      })
    );

    const validConversations = conversationsWithDetails.filter(
      (c): c is NonNullable<typeof c> => c !== null
    );

    return {
      isDone: endIndex >= userConversations.length,
      continueCursor:
        endIndex < userConversations.length ? String(endIndex) : "",
      page: validConversations,
    };
  },
});

// Get recent conversations for home page (simplified, no pagination)
export const getRecentConversations = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("conversations"),
      lastMessageTime: v.optional(v.number()),
      lastMessage: v.union(
        v.object({
          _id: v.id("messages"),
          content: v.string(),
          format: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("video"),
            v.literal("gif"),
            v.literal("location"),
            v.literal("album_share")
          ),
          senderId: v.id("users"),
          sentAt: v.number(),
        }),
        v.null()
      ),
      otherParticipant: v.object({
        _id: v.id("users"),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        isOnline: v.optional(v.boolean()),
      }),
      unreadCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    // Get all conversations, ordered by last message time
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageTime")
      .order("desc")
      .collect();

    // Filter to only this user's conversations
    const userConversations = allConversations
      .filter((c) => c.participantIds.includes(args.userId))
      .slice(0, limit);

    // Enrich with other participant info and last message
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conversation) => {
        const otherParticipantId = conversation.participantIds.find(
          (id) => id !== args.userId
        );

        if (!otherParticipantId) return null;

        const otherUser = await ctx.db.get(otherParticipantId);
        if (!otherUser) return null;

        const otherProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherParticipantId))
          .unique();

        // Get last message
        let lastMessage = null;
        if (conversation.lastMessageId) {
          const message = await ctx.db.get(conversation.lastMessageId);
          if (message) {
            lastMessage = {
              _id: message._id,
              content: message.content,
              format: message.format,
              senderId: message.senderId,
              sentAt: message.sentAt,
            };
          }
        }

        // Count unread messages
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .filter((q) => q.neq(q.field("senderId"), args.userId))
          .collect();

        const unreadCount = unreadMessages.filter(
          (msg) => !msg.readAt || !msg.readAt[args.userId]
        ).length;

        return {
          _id: conversation._id,
          lastMessageTime: conversation.lastMessageTime,
          lastMessage,
          otherParticipant: {
            _id: otherParticipantId,
            name: otherProfile?.displayName ?? otherUser.name,
            imageUrl: otherUser.imageUrl,
            isOnline: otherUser.isOnline,
          },
          unreadCount,
        };
      })
    );

    return conversationsWithDetails.filter(
      (c): c is NonNullable<typeof c> => c !== null
    );
  },
});

// Mark messages as read
export const markMessagesRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  returns: v.object({ updated: v.number() }),
  handler: async (ctx, { conversationId, userId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    let updatedCount = 0;
    const currentTime = Date.now();

    for (const message of messages) {
      // Skip messages sent by the user
      if (message.senderId === userId) continue;

      // Check if already read
      const hasRead = message.readAt && message.readAt[userId];
      if (!hasRead) {
        const currentReadAt = message.readAt || {};
        currentReadAt[userId] = currentTime;

        await ctx.db.patch(message._id, {
          readAt: currentReadAt,
        });
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});

// Get unread conversation count
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();

    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.userId)
    );

    let unreadCount = 0;

    for (const conversation of userConversations) {
      const lastMessage = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id)
        )
        .order("desc")
        .first();

      if (lastMessage) {
        const hasRead = lastMessage.readAt && lastMessage.readAt[args.userId];
        if (!hasRead && lastMessage.senderId !== args.userId) {
          unreadCount++;
        }
      }
    }

    return unreadCount;
  },
});

// Get user IDs who have sent unread messages to the current user
export const getUsersWithUnreadMessages = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(v.id("users")),
  handler: async (ctx, args) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();

    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.userId)
    );

    const usersWithUnread: Id<"users">[] = [];

    for (const conversation of userConversations) {
      // Get all unread messages from the other user
      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id)
        )
        .filter((q) => q.neq(q.field("senderId"), args.userId))
        .collect();

      // Check if any message is unread
      const hasUnread = unreadMessages.some(
        (msg) => !msg.readAt || !msg.readAt[args.userId]
      );

      if (hasUnread) {
        // Find the other participant
        const otherUserId = conversation.participantIds.find(
          (id) => id !== args.userId
        );
        if (otherUserId && !usersWithUnread.includes(otherUserId)) {
          usersWithUnread.push(otherUserId);
        }
      }
    }

    return usersWithUnread;
  },
});

// Get conversation details
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      otherParticipant: v.object({
        _id: v.id("users"),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        isOnline: v.optional(v.boolean()),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    if (!conversation.participantIds.includes(args.currentUserId)) {
      return null;
    }

    const otherParticipantId = conversation.participantIds.find(
      (id) => id !== args.currentUserId
    );

    if (!otherParticipantId) return null;

    const otherUser = await ctx.db.get(otherParticipantId);
    if (!otherUser) return null;

    const otherProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", otherParticipantId))
      .unique();

    return {
      _id: conversation._id,
      otherParticipant: {
        _id: otherParticipantId,
        name: otherProfile?.displayName ?? otherUser.name,
        imageUrl: otherUser.imageUrl,
        isOnline: otherUser.isOnline,
      },
    };
  },
});

// Generate upload URL for attachments
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get URL for a storage ID
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get user's previously sent media (images/videos)
export const getUserSentMedia = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all conversations for this user
    const allConversations = await ctx.db
      .query("conversations")
      .collect();

    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.userId)
    );

    // Get media messages from all user's conversations
    const mediaMessages: Array<{
      _id: Id<"messages">;
      storageId: Id<"_storage">;
      format: "image" | "video";
      sentAt: number;
    }> = [];

    for (const conversation of userConversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("senderId"), args.userId),
            q.or(
              q.eq(q.field("format"), "image"),
              q.eq(q.field("format"), "video")
            )
          )
        )
        .collect();

      for (const msg of messages) {
        if (msg.storageId) {
          mediaMessages.push({
            _id: msg._id,
            storageId: msg.storageId,
            format: msg.format as "image" | "video",
            sentAt: msg.sentAt,
          });
        }
      }
    }

    // Sort by sentAt descending and limit
    mediaMessages.sort((a, b) => b.sentAt - a.sentAt);
    const limitedMedia = mediaMessages.slice(0, limit);

    // Get URLs for each media
    const mediaWithUrls = await Promise.all(
      limitedMedia.map(async (media) => {
        const url = await ctx.storage.getUrl(media.storageId);
        return {
          ...media,
          url,
        };
      })
    );

    return mediaWithUrls.filter((m) => m.url !== null);
  },
});

// Delete a sent media message
export const deleteUserSentMedia = mutation({
  args: {
    userId: v.id("users"),
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify ownership
    if (message.senderId !== args.userId) {
      throw new Error("You can only delete your own messages");
    }

    // Verify it's a media message
    if (message.format !== "image" && message.format !== "video") {
      throw new Error("Can only delete media messages");
    }

    // Delete from storage if exists
    if (message.storageId) {
      await ctx.storage.delete(message.storageId);
    }

    // Delete the message record
    await ctx.db.delete(args.messageId);

    return null;
  },
});

// ============================================================================
// MESSAGE REPORTING
// ============================================================================

// Report a message
export const reportMessage = mutation({
  args: {
    reporterId: v.id("users"),
    messageId: v.id("messages"),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), reportId: v.id("reportedMessages") }),
  handler: async (ctx, args) => {
    // Check if user is banned or suspended
    await requireNotModerated(ctx, args.reporterId);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId === args.reporterId) {
      throw new Error("Cannot report your own message");
    }

    // Check if already reported by this user
    const existingReport = await ctx.db
      .query("reportedMessages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("reporterId"), args.reporterId))
      .first();

    if (existingReport) {
      throw new Error("You have already reported this message");
    }

    const reportId = await ctx.db.insert("reportedMessages", {
      reporterId: args.reporterId,
      messageId: args.messageId,
      conversationId: message.conversationId,
      messageSenderId: message.senderId,
      reason: args.reason,
      details: args.details,
      reportedAt: Date.now(),
      status: "pending",
    });

    return { success: true, reportId };
  },
});

