import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // 1 message per 3 seconds per session (prevent spam)
  guideMessage: { kind: "fixed window", period: 3000, rate: 1 },
  // Per-session token budget: ~10K tokens/hour (generous for chat)
  guideTokens: { kind: "token bucket", period: HOUR, rate: 10000, capacity: 30000 },
});
