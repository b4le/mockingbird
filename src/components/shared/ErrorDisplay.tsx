"use client";

import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  fallbackMessage: string;
}

export function ErrorDisplay({
  error,
  reset,
  title,
  fallbackMessage,
}: ErrorDisplayProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-xl bg-destructive/10 p-4">
        <AlertCircle className="mx-auto size-8 text-destructive" />
      </div>
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || fallbackMessage}
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Try again
      </button>
    </div>
  );
}
