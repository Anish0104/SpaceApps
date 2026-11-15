import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom has no matchMedia; components only use it to honour prefers-reduced-motion.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }) as MediaQueryList;
}

// jsdom does not implement scrolling; the app scrolls to the top on navigation.
window.scrollTo = (() => {}) as typeof window.scrollTo;

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer (Mission lab evidence map) needs one.
const g = globalThis as { ResizeObserver?: unknown };
g.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
