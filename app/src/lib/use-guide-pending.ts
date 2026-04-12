"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { consumePendingAction, executeGuideTool, hasGuideTool } from "@/lib/guide-registry";

/**
 * Hook for tool pages to consume pending guide actions.
 * Fires on every pathname change (not just mount), so it works
 * with client-side navigation via router.push.
 */
export function useGuidePending() {
  const pathname = usePathname();

  useEffect(() => {
    // Delay to let the page render and tools register
    const timer = setTimeout(async () => {
      const pending = consumePendingAction();
      if (!pending) return;

      // Execute tool to control inputs
      if (pending.tool && pending.inputs && hasGuideTool(pending.tool)) {
        executeGuideTool(pending.tool, pending.inputs);
      }

      // Highlight element with driver.js (retry up to 5 times)
      if (pending.highlight) {
        const tryHighlight = async (attempt: number) => {
          const el = document.querySelector(pending.highlight!);
          if (!el && attempt < 5) {
            setTimeout(() => tryHighlight(attempt + 1), 500);
            return;
          }
          if (!el) return;
          try {
            const { driver } = await import("driver.js");
            await import("driver.js/dist/driver.css");
            const d = driver({
              stagePadding: 8,
              stageRadius: 12,
              overlayOpacity: 0.15,
              allowClose: true,
              animate: true,
              showButtons: [],
            });
            d.highlight({
              element: pending.highlight!,
              popover: {
                title: pending.title || "",
                description: pending.description || "",
                side: "bottom",
                align: "center",
              },
            });
          } catch { /* driver.js not available */ }
        };
        tryHighlight(0);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname]); // Re-run on every navigation
}
