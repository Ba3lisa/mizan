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

export default crons;
