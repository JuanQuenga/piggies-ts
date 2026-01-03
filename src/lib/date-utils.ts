/**
 * Format a timestamp to a relative time string (e.g., "5m ago", "2h ago", "Yesterday")
 */
export function formatDistanceToNow(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return "now"
  } else if (minutes < 60) {
    return `${minutes}m`
  } else if (hours < 24) {
    return `${hours}h`
  } else if (days === 1) {
    return "Yesterday"
  } else if (days < 7) {
    return `${days}d`
  } else {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}

/**
 * Format a timestamp to a time string (e.g., "2:30 PM")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Format a timestamp to show date if not today, otherwise time
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  if (isToday) {
    return formatTime(timestamp)
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return `Yesterday ${formatTime(timestamp)}`
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Check if a timestamp is from today
 */
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp)
  const today = new Date()

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Format a date divider (e.g., "Today", "Yesterday", "Monday, Dec 25")
 */
export function formatDateDivider(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()

  const isDateToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  if (isDateToday) {
    return "Today"
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return "Yesterday"
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}


