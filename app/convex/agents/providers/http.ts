"use node";

export const DEFAULT_PROVIDER_TIMEOUT_MS = 2 * 60 * 1000;
export const WEB_RESEARCH_PROVIDER_TIMEOUT_MS = 5 * 60 * 1000;

export function withProviderTimeout(
  init: RequestInit,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): RequestInit {
  return {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  };
}
