import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check pending referrals daily at midnight UTC
// This activates referrals where the referred user has been active for 7+ days
crons.daily(
  "check pending referrals",
  { hourUTC: 0, minuteUTC: 0 },
  internal.referrals.checkPendingReferrals
);

// Check for expired referral Ultra subscriptions daily at 1 AM UTC
// This revokes Ultra access for users whose referral-based Ultra has expired
crons.daily(
  "check expired referral ultra",
  { hourUTC: 1, minuteUTC: 0 },
  internal.referrals.checkExpiredReferralUltra
);

// Clear expired suspensions every hour
// This automatically lifts suspensions when their time is up
crons.hourly(
  "clear expired suspensions",
  { minuteUTC: 30 },
  internal.admin.clearExpiredSuspensions
);

export default crons;
