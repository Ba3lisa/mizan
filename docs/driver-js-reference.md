# driver.js Reference for Next.js Tours

## 1. Import Pattern (No SSR)

driver.js accesses `document` on import. Dynamic import is mandatory.

```tsx
// WRONG - breaks hydration
import { driver } from "driver.js";

// CORRECT - lazy load inside useEffect
useEffect(() => {
  let driverObj: Awaited<ReturnType<typeof import("driver.js")>>["driver"] extends (...a: infer A) => infer R ? R : never;
  import("driver.js").then(({ driver }) => {
    import("driver.js/dist/driver.css");
    driverObj = driver({ /* config */ });
  });
  return () => driverObj?.destroy();
}, []);
```

## 2. Complete Config Reference

From `driver.js.d.ts` -- every option on `Config`:

| Option | Type | Default | Notes |
|---|---|---|---|
| `steps` | `DriveStep[]` | `[]` | Tour steps array |
| `animate` | `boolean` | `true` | Fade-in animations |
| `overlayColor` | `string` | `"black"` | Any CSS color |
| `overlayOpacity` | `number` | `0.5` | 0 = invisible overlay |
| `smoothScroll` | `boolean` | `false` | Smooth scroll to elements |
| `allowClose` | `boolean` | `true` | Backdrop click closes |
| `overlayClickBehavior` | `"close" \| "nextStep" \| DriverHook` | `"close"` | What backdrop click does |
| `stagePadding` | `number` | `10` | px gap around cutout |
| `stageRadius` | `number` | `5` | Cutout border radius |
| `disableActiveInteraction` | `boolean` | `false` | **true = highlighted element unclickable** |
| `allowKeyboardControl` | `boolean` | `true` | Arrow keys navigate |
| `popoverClass` | `string` | `""` | Added to `.driver-popover` |
| `popoverOffset` | `number` | `10` | Gap between popover and element |
| `showButtons` | `AllowedButtons[]` | `["next","previous","close"]` | `[]` hides all buttons |
| `disableButtons` | `AllowedButtons[]` | `[]` | Shown but greyed out |
| `showProgress` | `boolean` | `false` | "1 of 5" text |
| `progressText` | `string` | `"{{current}} of {{total}}"` | Template |
| `nextBtnText` | `string` | `"Next"` | |
| `prevBtnText` | `string` | `"Previous"` | |
| `doneBtnText` | `string` | `"Done"` | Last step button |

**Callbacks** (all receive `(element, step, { config, state, driver })`):

`onHighlightStarted`, `onHighlighted`, `onDeselected`, `onDestroyStarted`, `onDestroyed`, `onNextClick`, `onPrevClick`, `onCloseClick`

**Special:** `onPopoverRender(popoverDOM, { config, state, driver })` -- fires after popover DOM is created.

## 3. Non-Blocking Tour (Overlay Doesn't Block Clicks)

The blocking mechanism is CSS: `.driver-active * { pointer-events: none }`. Two approaches:

**A) Invisible overlay (overlay exists but transparent):**
```ts
driver({ overlayOpacity: 0, allowClose: false })
```
Still blocks clicks because `pointer-events: none` is on all `*` elements.

**B) Actually non-blocking (override the CSS):**
```css
/* Remove the blanket pointer-events kill */
.driver-active * {
  pointer-events: auto !important;
}
/* Keep popover clickable */
.driver-popover, .driver-popover * {
  pointer-events: auto !important;
}
```
Combine with `overlayOpacity: 0` and `allowClose: false`. The overlay SVG still exists but is invisible and pass-through.

## 4. Programmatic Control from React State

Hide driver.js buttons, drive from your own UI:

```tsx
const driverRef = useRef<Driver | null>(null);

// In your useEffect after import:
driverRef.current = driver({
  showButtons: [],        // hide all driver.js buttons
  allowClose: false,      // prevent backdrop dismiss
  allowKeyboardControl: false,
  steps: [/* ... */],
});
driverRef.current.drive(0);

// External button handlers:
const handleNext = () => driverRef.current?.moveNext();
const handlePrev = () => driverRef.current?.movePrevious();
const handleSkip = () => driverRef.current?.destroy();
const handleGoTo = (i: number) => driverRef.current?.moveTo(i);
```

**Critical:** When overriding `onNextClick`/`onPrevClick`, driver.js disables default navigation. You MUST call `moveNext()`/`movePrevious()` yourself inside the callback.

## 5. Cleanup on Unmount

```tsx
useEffect(() => {
  let d: Driver | null = null;
  import("driver.js").then(({ driver }) => { d = driver({...}); });
  return () => { d?.destroy(); d = null; };
}, []);
```

For SPA route changes: call `destroy()` in the cleanup. If highlight disappears after navigation, the DOM element was replaced. Use `element: () => document.querySelector("#my-el")!` (function form) so driver.js re-queries the DOM. Call `driverRef.current?.refresh()` after route transition settles.

## 6. Dark Theme CSS

```css
.driver-popover.dark-tour {
  background-color: #1a1a2e;
  color: #e0e0e0;
}
.driver-popover.dark-tour .driver-popover-title {
  color: #ffffff;
}
.driver-popover.dark-tour .driver-popover-description {
  color: #b0b0b0;
}
.driver-popover.dark-tour .driver-popover-close-btn {
  color: #666;
}
.driver-popover.dark-tour .driver-popover-close-btn:hover {
  color: #fff;
}
.driver-popover.dark-tour .driver-popover-footer button {
  background: #2a2a4a;
  color: #e0e0e0;
  border-color: #444;
}
.driver-popover.dark-tour .driver-popover-arrow {
  border-color: #1a1a2e; /* must match background */
}
.driver-popover.dark-tour .driver-popover-progress-text {
  color: #888;
}
```

Use: `driver({ popoverClass: "dark-tour" })`

## 7. useDriverTour Hook

```tsx
"use client";
import { useEffect, useRef, useCallback } from "react";
import type { Config, DriveStep, Driver } from "driver.js";

export function useDriverTour(steps: DriveStep[], config?: Partial<Config>) {
  const driverRef = useRef<Driver | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    let mounted = true;
    import("driver.js").then(({ driver }) => {
      if (!mounted) return;
      import("driver.js/dist/driver.css");
      driverRef.current = driver({
        showButtons: [],
        allowClose: false,
        allowKeyboardControl: false,
        overlayOpacity: 0,
        animate: false,
        ...config,
        steps: stepsRef.current,
      });
    });
    return () => { mounted = false; driverRef.current?.destroy(); driverRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((index = 0) => driverRef.current?.drive(index), []);
  const next = useCallback(() => driverRef.current?.moveNext(), []);
  const prev = useCallback(() => driverRef.current?.movePrevious(), []);
  const goTo = useCallback((i: number) => driverRef.current?.moveTo(i), []);
  const stop = useCallback(() => driverRef.current?.destroy(), []);
  const refresh = useCallback(() => driverRef.current?.refresh(), []);
  const highlight = useCallback((step: DriveStep) => driverRef.current?.highlight(step), []);
  const isActive = useCallback(() => driverRef.current?.isActive() ?? false, []);
  const getIndex = useCallback(() => driverRef.current?.getActiveIndex(), []);

  return { start, next, prev, goTo, stop, refresh, highlight, isActive, getIndex, driverRef };
}
```

## 8. Popover Positioning

Per-step `popover.side` and `popover.align`:

- **side:** `"top" | "right" | "bottom" | "left" | "over"` (over = on top of element, hides arrow)
- **align:** `"start" | "center" | "end"`

```ts
{ element: "#btn", popover: { title: "Click here", side: "bottom", align: "start" } }
```

## 9. Pitfalls

| Problem | Cause | Fix |
|---|---|---|
| Hydration crash | Top-level `import "driver.js"` | Dynamic import inside `useEffect` |
| Overlay blocks all clicks | `.driver-active * { pointer-events: none }` in CSS | Override with `pointer-events: auto !important` + `overlayOpacity: 0` |
| Highlight vanishes after navigation | DOM element replaced by React re-render | Use function form `element: () => document.querySelector(...)` + call `refresh()` |
| onNextClick doesn't advance | Overriding callback disables default behavior | Must call `driverObj.moveNext()` inside callback |
| Popover shows but no highlight | Element not in DOM yet when `drive()` called | Delay `drive()` or use `onHighlightStarted` to wait |
| Arrow color wrong on custom theme | Arrow uses `border-color` not `background` | Set `.driver-popover-arrow { border-color: <your-bg> }` matching side classes |
| `destroy()` not cleaning up | ref lost between renders | Store in `useRef`, destroy in `useEffect` cleanup |
