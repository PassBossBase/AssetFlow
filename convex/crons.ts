import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Monday 00:05 in Asia/Shanghai is Sunday 16:05 UTC.
crons.cron("weekly session refresh", "5 16 * * 0", internal.sessionMaintenance.revokeWeeklySessions, {});

export default crons;
