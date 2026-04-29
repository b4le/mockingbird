"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: ReadonlyArray<Shortcut> = [
  { keys: ["Space"], description: "Play or pause audio" },
  { keys: ["J"], description: "Next cue" },
  { keys: ["K"], description: "Previous cue" },
  { keys: ["Shift", "J"], description: "Next speaker turn" },
  { keys: ["Shift", "K"], description: "Previous speaker turn" },
  { keys: ["F"], description: "Focus search" },
  { keys: ["Cmd/Ctrl", "F"], description: "Focus search" },
  { keys: ["Esc"], description: "Clear search (when focused)" },
  { keys: ["?"], description: "Open this help dialog" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Shortcuts apply while focus is inside the transcript panel.
          </DialogDescription>
        </DialogHeader>
        <table className="w-full text-sm">
          <caption className="sr-only">Transcript keyboard shortcuts</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Shortcut</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((shortcut) => (
              <tr key={shortcut.keys.join("+")} className="border-t">
                <th
                  scope="row"
                  className="py-2 pr-3 text-left align-middle font-normal"
                >
                  <span className="inline-flex flex-wrap items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span
                        key={`${key}-${i}`}
                        className="inline-flex items-center gap-1"
                      >
                        {i > 0 ? (
                          <span
                            aria-hidden="true"
                            className="text-muted-foreground"
                          >
                            +
                          </span>
                        ) : null}
                        <Kbd>{key}</Kbd>
                      </span>
                    ))}
                  </span>
                </th>
                <td className="py-2 align-middle text-muted-foreground">
                  {shortcut.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
