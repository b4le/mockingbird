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
  // Defense-in-depth: the app is a static export today (next.config.ts
  // `output: "export"`, asserted by `next-config.test.ts`), so server-component
  // errors fail the build rather than reaching a client. If that ever flips to
  // SSR/ISR, a thrown server-component error would surface here and
  // `error.message` could leak filesystem paths or stack details. Render the
  // hashed `error.digest` in production and reserve raw messages for dev DX.
  // Note: `NODE_ENV === "test"` (vitest default) falls through to the dev
  // branch — intentional, so component tests can assert dev behaviour without
  // having to stub the env for every case.
  const isProduction = process.env.NODE_ENV === "production";
  const detail = isProduction
    ? error.digest
      ? `Reference: ${error.digest}`
      : fallbackMessage
    : error.message || fallbackMessage;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-xl bg-destructive/10 p-4">
        <AlertCircle className="mx-auto size-8 text-destructive" />
      </div>
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      <button
        onClick={reset}
        className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Try again
      </button>
    </div>
  );
}
