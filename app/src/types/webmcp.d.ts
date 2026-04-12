/**
 * WebMCP (Web Model Context Protocol) type declarations.
 *
 * W3C Community Group Draft — https://webmachinelearning.github.io/webmcp/
 * Adds `navigator.modelContext` for exposing page tools to AI agents
 * (e.g. Chrome Gemini, Claude, etc.)
 */

interface WebMCPToolContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
}

interface WebMCPToolResult {
  content: WebMCPToolContent[];
  isError?: boolean;
}

interface WebMCPToolAnnotations {
  /** Tool does not modify any state */
  readOnlyHint?: boolean;
  /** Tool may have destructive side-effects */
  destructiveHint?: boolean;
  /** Tool is idempotent (safe to retry) */
  idempotentHint?: boolean;
  /** Tool interacts with the real world outside the page */
  openWorldHint?: boolean;
}

interface WebMCPClient {
  /** Request user interaction (e.g. confirmation dialog) during tool execution */
  requestUserInteraction<T>(callback: () => T | Promise<T>): Promise<T>;
}

interface WebMCPToolDefinition {
  /** Unique tool identifier — 1-128 chars, [a-zA-Z0-9_\-\.] */
  name: string;
  /** Natural language description for agents */
  description: string;
  /** Human-readable display label */
  title?: string;
  /** JSON Schema for tool input parameters */
  inputSchema: Record<string, unknown>;
  /** Behavioral hints for agents */
  annotations?: WebMCPToolAnnotations;
  /** Callback invoked by the agent with validated input */
  execute: (
    input: Record<string, unknown>,
    client: WebMCPClient,
  ) => Promise<WebMCPToolResult> | WebMCPToolResult;
}

interface WebMCPRegisterToolOptions {
  signal?: AbortSignal;
}

interface ModelContext {
  registerTool(
    tool: WebMCPToolDefinition,
    options?: WebMCPRegisterToolOptions,
  ): void;
  unregisterTool(name: string): void;
  provideContext(config: { tools: WebMCPToolDefinition[] }): void;
  clearContext(): void;
}

declare global {
  interface Navigator {
    /** WebMCP Model Context API — requires SecureContext (HTTPS) */
    modelContext?: ModelContext;
  }
}

export type {
  WebMCPToolDefinition,
  WebMCPToolResult,
  WebMCPToolContent,
  WebMCPToolAnnotations,
  WebMCPClient,
  WebMCPRegisterToolOptions,
  ModelContext,
};
