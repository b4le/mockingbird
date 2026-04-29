import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useEffect } from "react";
import {
  AudioPlayerProvider,
  useAudioPlayerControls,
  useAudioPlayerRegistry,
  useAudioPlayerState,
} from "../AudioPlayerContext";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Helper: render an audio element into the provider's tree and
// register it through the same hook that `AudioReferencePlayer` uses.
// We control playback state from the test by spying on play/pause and
// by mutating `currentTime` + dispatching events on the element — the
// real `<audio>` element in happy-dom doesn't decode any media.
function Harness({
  audioRef,
}: {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}) {
  const registry = useAudioPlayerRegistry();
  useEffect(() => {
    if (!registry || !audioRef.current) return;
    registry.registerAudioElement(audioRef.current);
    return () => {
      registry.registerAudioElement(null);
    };
  }, [registry, audioRef]);
  return <audio ref={audioRef} />;
}

function setup() {
  const audioRef: { current: HTMLAudioElement | null } = { current: null };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AudioPlayerProvider>
      <Harness audioRef={audioRef} />
      {children}
    </AudioPlayerProvider>
  );
  return { audioRef, wrapper };
}

describe("AudioPlayerContext", () => {
  beforeEach(() => {
    // Stub play/pause on the prototype because happy-dom's audio
    // element doesn't implement them as real promises and pause is a
    // no-op that doesn't actually flip `paused`.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
      function (this: HTMLMediaElement) {
        Object.defineProperty(this, "paused", {
          configurable: true,
          get: () => false,
        });
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      },
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      function (this: HTMLMediaElement) {
        Object.defineProperty(this, "paused", {
          configurable: true,
          get: () => true,
        });
        this.dispatchEvent(new Event("pause"));
      },
    );
  });

  it("subscribers see throttled currentMs updates from timeupdate", () => {
    vi.useFakeTimers();
    const { audioRef, wrapper } = setup();
    const { result } = renderHook(() => useAudioPlayerState(), { wrapper });
    expect(result.current.currentMs).toBe(0);

    const el = audioRef.current!;
    expect(el).toBeTruthy();

    // First tick flushes immediately because no throttle window is
    // active yet.
    act(() => {
      Object.defineProperty(el, "currentTime", {
        configurable: true,
        get: () => 0.5,
      });
      el.dispatchEvent(new Event("timeupdate"));
    });
    expect(result.current.currentMs).toBe(500);

    // Subsequent ticks within the 100ms window must be coalesced —
    // the snapshot should NOT update mid-window.
    act(() => {
      Object.defineProperty(el, "currentTime", {
        configurable: true,
        get: () => 0.55,
      });
      el.dispatchEvent(new Event("timeupdate"));
    });
    act(() => {
      Object.defineProperty(el, "currentTime", {
        configurable: true,
        get: () => 0.6,
      });
      el.dispatchEvent(new Event("timeupdate"));
    });
    expect(result.current.currentMs).toBe(500);

    // After the window closes, the trailing edge fires with the
    // latest value.
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.currentMs).toBe(600);
  });

  it("flushes immediately on play / pause / seeked / loadedmetadata", () => {
    vi.useFakeTimers();
    const { audioRef, wrapper } = setup();
    const { result } = renderHook(() => useAudioPlayerState(), { wrapper });
    const el = audioRef.current!;

    // Open a throttle window with a timeupdate, then bypass it with a
    // user-perceptible event — the snapshot must reflect the latest
    // value WITHOUT waiting 100ms.
    act(() => {
      Object.defineProperty(el, "currentTime", {
        configurable: true,
        get: () => 0.1,
      });
      el.dispatchEvent(new Event("timeupdate"));
    });
    expect(result.current.currentMs).toBe(100);

    act(() => {
      Object.defineProperty(el, "currentTime", {
        configurable: true,
        get: () => 0.2,
      });
      el.dispatchEvent(new Event("timeupdate"));
    });
    expect(result.current.currentMs).toBe(100);

    act(() => {
      Object.defineProperty(el, "currentTime", {
        configurable: true,
        get: () => 2,
      });
      el.dispatchEvent(new Event("seeked"));
    });
    expect(result.current.currentMs).toBe(2000);

    // duration arrives via loadedmetadata — durationMs should reflect
    // it immediately, not on the next throttled tick.
    act(() => {
      Object.defineProperty(el, "duration", {
        configurable: true,
        get: () => 42,
      });
      el.dispatchEvent(new Event("loadedmetadata"));
    });
    expect(result.current.durationMs).toBe(42000);
  });

  it("seek mutates currentTime and emits a fresh snapshot", () => {
    // Render both hooks in a SINGLE wrapper instance so they share
    // one provider (and one store). Calling `renderHook` twice with
    // the same `wrapper` factory creates two independent providers.
    const { audioRef, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        state: useAudioPlayerState(),
        controls: useAudioPlayerControls(),
      }),
      { wrapper },
    );
    const el = audioRef.current!;

    // happy-dom's audio element accepts arbitrary currentTime writes.
    // After `seek`, the store reads back the new value via
    // flushFromElement and emits a snapshot.
    act(() => {
      result.current.controls.seek(12_345);
    });
    expect(el.currentTime).toBeCloseTo(12.345);
    expect(result.current.state.currentMs).toBe(12345);
  });

  it("togglePlay flips isPlaying via play/pause events", () => {
    const { audioRef, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        state: useAudioPlayerState(),
        controls: useAudioPlayerControls(),
      }),
      { wrapper },
    );
    const el = audioRef.current!;
    // Default `paused` is true on a fresh audio element.
    expect(el.paused).toBe(true);
    expect(result.current.state.isPlaying).toBe(false);

    act(() => {
      result.current.controls.togglePlay();
    });
    expect(result.current.state.isPlaying).toBe(true);

    act(() => {
      result.current.controls.togglePlay();
    });
    expect(result.current.state.isPlaying).toBe(false);
  });

  it("controls are no-ops when no audio element is registered", () => {
    // Provider mounted but no <audio> registered — every control
    // should silently no-op rather than throwing.
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    );
    const { result: controls } = renderHook(() => useAudioPlayerControls(), {
      wrapper,
    });
    expect(() => controls.current.seek(1000)).not.toThrow();
    expect(() => controls.current.togglePlay()).not.toThrow();
    expect(() => controls.current.play()).not.toThrow();
    expect(() => controls.current.pause()).not.toThrow();
  });

  it("controls outside any provider are safe no-ops", () => {
    const { result: controls } = renderHook(() => useAudioPlayerControls());
    expect(() => controls.current.seek(0)).not.toThrow();
    expect(() => controls.current.togglePlay()).not.toThrow();
  });

  it("useAudioPlayerState outside any provider returns the initial state", () => {
    const { result } = renderHook(() => useAudioPlayerState());
    expect(result.current).toEqual({
      currentMs: 0,
      durationMs: null,
      isPlaying: false,
    });
  });

  it("re-registering a different element detaches the previous one", () => {
    // Two consecutive registrations should not leak listeners on the
    // first element — verified by ensuring its events stop driving
    // the store after a swap.
    const registryHolder: {
      current: ReturnType<typeof useAudioPlayerRegistry>;
    } = { current: null };
    function CaptureRegistry() {
      const registry = useAudioPlayerRegistry();
      // Stash via effect to keep the render pure.
      useEffect(() => {
        registryHolder.current = registry;
      }, [registry]);
      return null;
    }
    const first = document.createElement("audio");
    const second = document.createElement("audio");

    const { result } = renderHook(() => useAudioPlayerState(), {
      wrapper: ({ children }) => (
        <AudioPlayerProvider>
          <CaptureRegistry />
          {children}
        </AudioPlayerProvider>
      ),
    });

    act(() => {
      registryHolder.current!.registerAudioElement(first);
    });
    act(() => {
      Object.defineProperty(first, "currentTime", {
        configurable: true,
        get: () => 1,
      });
      first.dispatchEvent(new Event("timeupdate"));
    });
    expect(result.current.currentMs).toBe(1000);

    act(() => {
      registryHolder.current!.registerAudioElement(second);
    });

    // Events on the first (now-detached) element must NOT update the
    // snapshot.
    act(() => {
      Object.defineProperty(first, "currentTime", {
        configurable: true,
        get: () => 99,
      });
      first.dispatchEvent(new Event("timeupdate"));
    });
    expect(result.current.currentMs).not.toBe(99000);
  });
});
