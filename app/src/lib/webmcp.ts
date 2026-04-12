/**
 * WebMCP hook — registers page tools with `navigator.modelContext`
 * so AI agents (Chrome Gemini, etc.) can discover and invoke them.
 *
 * Usage:
 *   useWebMCPTool({
 *     name: "calculate_tax",
 *     description: "Calculate Egyptian income tax",
 *     inputSchema: { type: "object", properties: { salary: { type: "number" } }, required: ["salary"] },
 *     execute: async (input) => ({ content: [{ type: "text", text: "..." }] }),
 *   });
 */

import { useEffect, useRef, useCallback } from "react";
import type {
  WebMCPToolDefinition,
  WebMCPToolResult,
} from "@/types/webmcp";
import { registerGuideTool, unregisterGuideTool } from "@/lib/guide-registry";

export interface UseWebMCPToolOptions {
  name: string;
  description: string;
  title?: string;
  inputSchema: Record<string, unknown>;
  readOnly?: boolean;
  execute: (input: Record<string, unknown>) => Promise<WebMCPToolResult> | WebMCPToolResult;
}

/**
 * Register a single tool with the WebMCP `navigator.modelContext` API.
 * Handles:
 *  - Feature detection (no-op if API unavailable)
 *  - React Strict Mode double-mount guard
 *  - Cleanup on unmount
 */
export function useWebMCPTool(options: UseWebMCPToolOptions): void {
  const registeredRef = useRef(false);
  const executeRef = useRef(options.execute);
  executeRef.current = options.execute;

  const { name, description, title, inputSchema, readOnly } = options;

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    // Always register in guide chat registry (works everywhere)
    registerGuideTool(name, (input) => executeRef.current(input));

    // Also register in WebMCP browser API if available
    const mc = navigator.modelContext;
    if (mc) {
      const tool: WebMCPToolDefinition = {
        name,
        description,
        ...(title ? { title } : {}),
        inputSchema,
        annotations: { readOnlyHint: readOnly ?? true },
        execute: async (input) => {
          try {
            return await executeRef.current(input);
          } catch (err) {
            return {
              content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
              isError: true,
            };
          }
        },
      };
      mc.registerTool(tool);
    }

    return () => {
      registeredRef.current = false;
      unregisterGuideTool(name);
      try { navigator.modelContext?.unregisterTool(name); } catch { /* ok */ }
    };
  }, [name, description, title, inputSchema, readOnly]);
}

/**
 * Register multiple tools at once via `provideContext`.
 * Replaces all previously registered tools on this page.
 */
export function useWebMCPTools(tools: UseWebMCPToolOptions[]): void {
  const registeredRef = useRef(false);
  const executeRefs = useRef<Map<string, UseWebMCPToolOptions["execute"]>>(new Map());

  // Keep execute refs current
  for (const t of tools) {
    executeRefs.current.set(t.name, t.execute);
  }

  const toolsKey = tools.map((t) => t.name).join(",");

  useEffect(() => {
    const mc = navigator.modelContext;
    if (!mc || registeredRef.current) return;

    registeredRef.current = true;

    const defs: WebMCPToolDefinition[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      ...(t.title ? { title: t.title } : {}),
      inputSchema: t.inputSchema,
      annotations: { readOnlyHint: t.readOnly ?? true },
      execute: async (input) => {
        const fn = executeRefs.current.get(t.name);
        if (!fn) return { content: [{ type: "text", text: "Tool not available" }], isError: true };
        try {
          return await fn(input);
        } catch (err) {
          return {
            content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
            isError: true,
          };
        }
      },
    }));

    mc.provideContext({ tools: defs });

    return () => {
      registeredRef.current = false;
      try {
        mc.clearContext();
      } catch {
        // already cleared
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsKey]);
}

/** Helper to build a text-only WebMCP result */
export function mcpText(text: string): WebMCPToolResult {
  return { content: [{ type: "text", text }] };
}

/** Helper to build a JSON WebMCP result */
export function mcpJSON(data: unknown): WebMCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// Re-export types for convenience
export type { WebMCPToolDefinition, WebMCPToolResult } from "@/types/webmcp";
