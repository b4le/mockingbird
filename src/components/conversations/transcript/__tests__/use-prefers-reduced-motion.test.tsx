import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { usePrefersReducedMotion } from "../use-prefers-reduced-motion";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface FakeMQL {
  matches: boolean;
  media: string;
  onchange: ((ev: MediaQueryListEvent) => void) | null;
  addEventListener: (
    type: "change",
    listener: (ev: MediaQueryListEvent) => void,
  ) => void;
  removeEventListener: (
    type: "change",
    listener: (ev: MediaQueryListEvent) => void,
  ) => void;
  addListener: (listener: (ev: MediaQueryListEvent) => void) => void;
  removeListener: (listener: (ev: MediaQueryListEvent) => void) => void;
  dispatchEvent: (ev: MediaQueryListEvent) => boolean;
  __emit: (matches: boolean) => void;
}

function makeMatchMedia(initial: boolean) {
  let listeners: Array<(ev: MediaQueryListEvent) => void> = [];
  const mql: FakeMQL = {
    matches: initial,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type, listener) => {
      listeners.push(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners = listeners.filter((l) => l !== listener);
    },
    addListener: (listener) => {
      listeners.push(listener);
    },
    removeListener: (listener) => {
      listeners = listeners.filter((l) => l !== listener);
    },
    dispatchEvent: () => true,
    __emit: (matches: boolean) => {
      mql.matches = matches;
      const event = { matches } as MediaQueryListEvent;
      for (const l of listeners) l(event);
    },
  };
  return mql;
}

describe("usePrefersReducedMotion", () => {
  it("returns false when matchMedia is unavailable (SSR-like)", () => {
    const original = window.matchMedia;
    // Simulate the SSR-like path where matchMedia isn't a function.
    // (Effect short-circuits and the initial state stays false.)
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: undefined,
    });
    try {
      const { result } = renderHook(() => usePrefersReducedMotion());
      expect(result.current).toBe(false);
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: original,
      });
    }
  });

  it("matches the initial matchMedia state", () => {
    const mql = makeMatchMedia(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(
      mql as unknown as MediaQueryList,
    );
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", () => {
    const mql = makeMatchMedia(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(
      mql as unknown as MediaQueryList,
    );
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => {
      mql.__emit(true);
    });
    expect(result.current).toBe(true);
    act(() => {
      mql.__emit(false);
    });
    expect(result.current).toBe(false);
  });
});
