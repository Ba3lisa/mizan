import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the AI data agent every 6 hours to check for stale data and refresh it.
crons.interval(
  "refresh-all-data",
  { hours: 6 },
  internal.agents.dataAgent.orchestrateRefresh,
  {}
);

// Process GitHub Issues every 6 hours (runs after data refresh).
crons.interval(
  "process-github-issues",
  { hours: 6 },
  internal.agents.githubAgent.processGitHubIssues,
  {}
);

// Generate a new daily poll every 24 hours using AI.
crons.interval(
  "generate-daily-poll",
  { hours: 24 },
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
