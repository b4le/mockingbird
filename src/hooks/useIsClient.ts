"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns `true` on the client, `false` during SSR — without causing an extra
 * render pass like the common `useState(false) + useEffect(setMounted(true))`
 * pattern. Use for client-only rendering inside server-rendered components.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
