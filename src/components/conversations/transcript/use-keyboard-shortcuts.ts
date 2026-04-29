"use client";

import { useEffect, type RefObject } from "react";

export interface KeyboardShortcutHandlers {
  onPlayPause?: () => void;
  onPrevCue?: () => void;
  onNextCue?: () => void;
  onPrevTurn?: () => void;
  onNextTurn?: () => void;
  onFocusSearch?: () => void;
  onClearSearch?: () => void;
  onOpenHelp?: () => void;
}

interface UseKeyboardShortcutsOptions extends KeyboardShortcutHandlers {
  panelRef: RefObject<HTMLElement | null>;
}

const TEXT_INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return TEXT_INPUT_TAGS.has(target.tagName);
}

function isSearchInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName !== "INPUT") return false;
  return (target as HTMLInputElement).type === "search";
}

// Single keydown listener bound to the panel element. Shortcuts are scoped to
// the panel so the shared transcript hotkeys don't fight with global app
// keybindings (e.g. tab-level Cmd+F).
export function useKeyboardShortcuts({
  panelRef,
  onPlayPause,
  onPrevCue,
  onNextCue,
  onPrevTurn,
  onNextTurn,
  onFocusSearch,
  onClearSearch,
  onOpenHelp,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    function handler(event: KeyboardEvent) {
      const target = event.target;
      const inTextInput = isTextInput(target);
      const inSearch = isSearchInput(target);

      // Cmd/Ctrl+F: panel-scoped focus into search.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        if (onFocusSearch) {
          event.preventDefault();
          onFocusSearch();
        }
        return;
      }

      // Esc clears the search field when it owns focus.
      if (event.key === "Escape") {
        if (inSearch && onClearSearch) {
          event.preventDefault();
          onClearSearch();
        }
        return;
      }

      // Don't steal text-input keystrokes for the typing-key shortcuts.
      if (inTextInput) return;

      if (event.key === " " || event.code === "Space") {
        if (onPlayPause) {
          event.preventDefault();
          onPlayPause();
        }
        return;
      }

      if (event.key === "?") {
        if (onOpenHelp) {
          event.preventDefault();
          onOpenHelp();
        }
        return;
      }

      // Plain F (no modifier) also focuses search when typed outside an input.
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "f") {
        if (onFocusSearch) {
          event.preventDefault();
          onFocusSearch();
        }
        return;
      }

      const lowered = event.key.toLowerCase();
      if (lowered === "j") {
        if (event.shiftKey) {
          if (onNextTurn) {
            event.preventDefault();
            onNextTurn();
          }
        } else if (onNextCue) {
          event.preventDefault();
          onNextCue();
        }
        return;
      }

      if (lowered === "k") {
        if (event.shiftKey) {
          if (onPrevTurn) {
            event.preventDefault();
            onPrevTurn();
          }
        } else if (onPrevCue) {
          event.preventDefault();
          onPrevCue();
        }
        return;
      }
    }

    node.addEventListener("keydown", handler);
    return () => {
      node.removeEventListener("keydown", handler);
    };
  }, [
    panelRef,
    onPlayPause,
    onPrevCue,
    onNextCue,
    onPrevTurn,
    onNextTurn,
    onFocusSearch,
    onClearSearch,
    onOpenHelp,
  ]);
}
