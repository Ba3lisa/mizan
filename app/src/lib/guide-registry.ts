/**
 * Client-side tool registry for the guide chat.
 *
 * Tool pages register their WebMCP execute functions here.
 * When the guide agent suggests an action, the frontend navigates
 * to the page and calls the registered execute function to control
 * sliders, inputs, and other UI elements.
 */

type ToolExecuteFn = (input: Record<string, unknown>) => unknown;

const registry = new Map<string, ToolExecuteFn>();

/** Register a tool's execute function (called by useWebMCPTool on mount) */
export function registerGuideTool(name: string, execute: ToolExecuteFn) {
  registry.set(name, execute);
}

/** Unregister a tool (called on unmount) */
export function unregisterGuideTool(name: string) {
  registry.delete(name);
}

/** Execute a registered tool by name */
export function executeGuideTool(name: string, input: Record<string, unknown>): unknown {
  const fn = registry.get(name);
  if (!fn) return null;
  return fn(input);
}

/** Check if a tool is registered */
export function hasGuideTool(name: string): boolean {
  return registry.has(name);
}

/** Get all registered tool names */
export function listGuideTools(): string[] {
  return Array.from(registry.keys());
}

// ─── Pending action (persisted via localStorage for cross-page navigation) ──

export interface PendingGuideAction {
  tool?: string;
  inputs?: Record<string, unknown>;
  highlight?: string | null;
  hint?: string | null;
  title?: string;
  description?: string;
}

const PENDING_KEY = "mizan-guide-pending";
const THREAD_KEY = "mizan-guide-threadId";

export function savePendingAction(action: PendingGuideAction) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(action)); } catch { /* ok */ }
}

export function consumePendingAction(): PendingGuideAction | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveThreadId(id: string) {
  try { localStorage.setItem(THREAD_KEY, id); } catch { /* ok */ }
}

export function getThreadId(): string | null {
  try { return localStorage.getItem(THREAD_KEY); } catch { return null; }
}

export function clearThreadId() {
  try { localStorage.removeItem(THREAD_KEY); } catch { /* ok */ }
}
