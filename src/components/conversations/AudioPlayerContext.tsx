"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Single source of truth for the conversation-detail audio element so
 * descendants (transcript cues, scrubbers, captions) can read playback
 * state and issue seek/play commands without owning the `<audio>` DOM
 * node themselves.
 *
 * Why a custom store instead of `useState`/context-of-state?
 *
 * The native `<audio>` element fires `timeupdate` at ~50Hz during
 * playback. Routing every tick through React state would re-render
 * every subscriber 50 times per second — fine for a timer, lethal for
 * a virtualized transcript that diff-checks "is this cue active?" on
 * every cue. We back the context with a hand-rolled store and expose it
 * through `useSyncExternalStore`, which lets us throttle `timeupdate`
 * snapshot flushes to ~10Hz while still flushing immediately on the
 * lifecycle events that users actually perceive (play, pause, seeked,
 * ended, loadedmetadata).
 *
 * The provider does NOT render an `<audio>` element itself. The first
 * descendant `<AudioReferencePlayer>` registers its own rendered
 * `<audio>` with the store via `registerAudioElement`. This preserves
 * `AudioReferencePlayer`'s drop-anywhere contract — when no provider
 * is present (timeline, evidence, communications), the component
 * behaves exactly as before.
 */

export interface AudioPlayerState {
  currentMs: number;
  durationMs: number | null;
  isPlaying: boolean;
}

export interface AudioPlayerControls {
  seek: (ms: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
}

const TIMEUPDATE_THROTTLE_MS = 100;

const INITIAL_STATE: AudioPlayerState = {
  currentMs: 0,
  durationMs: null,
  isPlaying: false,
};

type Listener = () => void;

class AudioPlayerStore {
  private state: AudioPlayerState = INITIAL_STATE;
  private listeners = new Set<Listener>();
  private element: HTMLAudioElement | null = null;
  private detach: (() => void) | null = null;
  private timeupdateTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTimeupdate = false;

  getSnapshot = (): AudioPlayerState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  registerAudioElement = (element: HTMLAudioElement | null): void => {
    if (this.element === element) return;
    // Tear down listeners on the previous element (if any) before
    // attaching to the new one. Without this, multiple audio elements
    // registering through the same provider would leak listeners.
    if (this.detach) {
      this.detach();
      this.detach = null;
    }
    this.cancelThrottle();
    this.element = element;
    if (element) {
      this.detach = this.attach(element);
      this.flushFromElement();
    } else {
      this.setState(INITIAL_STATE);
    }
  };

  seek = (ms: number): void => {
    const el = this.element;
    if (!el) return;
    const clamped = Math.max(0, ms);
    el.currentTime = clamped / 1000;
    // Some browsers don't fire `seeked` until the next tick; surface
    // the position immediately so a click on a cue feels responsive
    // even before the event loops back.
    this.flushFromElement();
  };

  togglePlay = (): void => {
    const el = this.element;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => {
        // Autoplay/permission rejections are surfaced to the user via
        // the native controls; swallow here so the callback contract
        // (sync, void) stays clean.
      });
    } else {
      el.pause();
    }
  };

  play = (): void => {
    const el = this.element;
    if (!el) return;
    void el.play().catch(() => {});
  };

  pause = (): void => {
    const el = this.element;
    if (!el) return;
    el.pause();
  };

  private attach(element: HTMLAudioElement): () => void {
    const onTimeUpdate = () => this.scheduleTimeupdate();
    const onImmediateFlush = () => {
      this.cancelThrottle();
      this.flushFromElement();
    };

    element.addEventListener("timeupdate", onTimeUpdate);
    element.addEventListener("play", onImmediateFlush);
    element.addEventListener("pause", onImmediateFlush);
    element.addEventListener("seeking", onImmediateFlush);
    element.addEventListener("seeked", onImmediateFlush);
    element.addEventListener("ended", onImmediateFlush);
    element.addEventListener("loadedmetadata", onImmediateFlush);
    element.addEventListener("durationchange", onImmediateFlush);

    return () => {
      element.removeEventListener("timeupdate", onTimeUpdate);
      element.removeEventListener("play", onImmediateFlush);
      element.removeEventListener("pause", onImmediateFlush);
      element.removeEventListener("seeking", onImmediateFlush);
      element.removeEventListener("seeked", onImmediateFlush);
      element.removeEventListener("ended", onImmediateFlush);
      element.removeEventListener("loadedmetadata", onImmediateFlush);
      element.removeEventListener("durationchange", onImmediateFlush);
    };
  }

  private scheduleTimeupdate(): void {
    if (this.timeupdateTimer != null) {
      this.pendingTimeupdate = true;
      return;
    }
    this.flushFromElement();
    this.timeupdateTimer = setTimeout(() => {
      this.timeupdateTimer = null;
      if (this.pendingTimeupdate) {
        this.pendingTimeupdate = false;
        this.flushFromElement();
      }
    }, TIMEUPDATE_THROTTLE_MS);
  }

  private cancelThrottle(): void {
    if (this.timeupdateTimer != null) {
      clearTimeout(this.timeupdateTimer);
      this.timeupdateTimer = null;
    }
    this.pendingTimeupdate = false;
  }

  private flushFromElement(): void {
    const el = this.element;
    if (!el) return;
    const duration = el.duration;
    this.setState({
      currentMs: Math.round(el.currentTime * 1000),
      // `<audio>.duration` is `NaN` until metadata loads and may be
      // `Infinity` for live streams. Normalise to `null` for both so
      // consumers can render an empty duration without an `isFinite`
      // guard everywhere.
      durationMs:
        Number.isFinite(duration) && duration > 0
          ? Math.round(duration * 1000)
          : null,
      isPlaying: !el.paused && !el.ended,
    });
  }

  private setState(next: AudioPlayerState): void {
    if (
      next.currentMs === this.state.currentMs &&
      next.durationMs === this.state.durationMs &&
      next.isPlaying === this.state.isPlaying
    ) {
      return;
    }
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}

interface AudioPlayerRegistry {
  store: AudioPlayerStore;
  registerAudioElement: (element: HTMLAudioElement | null) => void;
}

const AudioPlayerContext = createContext<AudioPlayerRegistry | null>(null);

export function AudioPlayerProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  // Stable for the lifetime of the provider. `useMemo` with an empty
  // dep array is the conventional way to hold an instance per mount
  // without paying for re-creation on re-render.
  const store = useMemo(() => new AudioPlayerStore(), []);

  const registerAudioElement = useCallback(
    (element: HTMLAudioElement | null) => {
      store.registerAudioElement(element);
    },
    [store],
  );

  const value = useMemo<AudioPlayerRegistry>(
    () => ({ store, registerAudioElement }),
    [store, registerAudioElement],
  );

  // Detach on unmount so a hot-reloaded provider doesn't leak event
  // listeners on the previous `<audio>` element.
  useEffect(() => {
    return () => {
      store.registerAudioElement(null);
    };
  }, [store]);

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

/**
 * Returns the registry if a provider is present, otherwise `null`.
 * `AudioReferencePlayer` calls this so it can register its rendered
 * `<audio>` element when a provider exists and otherwise stay
 * unaffected.
 */
export function useAudioPlayerRegistry(): AudioPlayerRegistry | null {
  return useContext(AudioPlayerContext);
}

/**
 * Throttled subscription to the audio element's playback state. Safe
 * to call from any descendant of `AudioPlayerProvider`. Re-renders the
 * caller at most ~10Hz during continuous playback (every `timeupdate`
 * tick), and immediately on user-perceptible lifecycle events.
 */
export function useAudioPlayerState(): AudioPlayerState {
  const registry = useContext(AudioPlayerContext);
  // `useSyncExternalStore` requires stable identities for both
  // `subscribe` and `getSnapshot`. The `noopSubscribe` and
  // `getDefaultSnapshot` paths support the case where the hook is
  // called outside a provider (e.g. during a Storybook story); we
  // return the initial state and never notify.
  const subscribe = useMemo(() => {
    if (registry) return registry.store.subscribe;
    return noopSubscribe;
  }, [registry]);
  const getSnapshot = useMemo(() => {
    if (registry) return registry.store.getSnapshot;
    return getDefaultSnapshot;
  }, [registry]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Imperative controls bound to the registered `<audio>` element. Calls
 * are no-ops when no element is registered, which keeps consumers
 * (e.g. cue click handlers) from needing a presence guard.
 *
 * The returned object's identity is stable per `registry` value, which
 * itself is stable for the provider's lifetime, so passing these
 * controls into memoised children (e.g. virtualised transcript rows)
 * does not invalidate their memoisation on re-render.
 */
export function useAudioPlayerControls(): AudioPlayerControls {
  const registry = useContext(AudioPlayerContext);
  return useMemo<AudioPlayerControls>(
    () => ({
      seek: (ms: number) => {
        registry?.store.seek(ms);
      },
      togglePlay: () => {
        registry?.store.togglePlay();
      },
      play: () => {
        registry?.store.play();
      },
      pause: () => {
        registry?.store.pause();
      },
    }),
    [registry],
  );
}

const noopSubscribe: (listener: Listener) => () => void = () => () => {};
const getDefaultSnapshot = (): AudioPlayerState => INITIAL_STATE;

// Re-exported for the small `AudioReferencePlayer` integration. Not
// part of the public surface.
export { AudioPlayerContext };
