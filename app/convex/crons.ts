import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the AI data agent every 12 hours to check for stale data and refresh it.
crons.interval(
  "refresh-all-data",
  { hours: 12 },
  internal.agents.dataAgent.orchestrateRefresh,
  {}
);

// GitHub Issues are now handled by Claude routines (see .github/workflows/claude-fix.yml)
// The old processGitHubIssues cron has been removed.

// Generate a new weekly poll using AI.
crons.interval(
  "generate-weekly-poll",
  { hours: 168 },
  internal.agents.pollAgent.generateDailyPoll,
  {}
);

// Compact old refresh logs daily (keeps last 30 days, archives the rest).
crons.interval(
  "compact-logs",
  { hours: 24 },
  internal.agents.maintenance.compactRefreshLogs,
  {}
);

export default crons;
