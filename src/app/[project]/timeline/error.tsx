"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";

export default function TimelineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Timeline error boundary caught:", error);
  }, [error]);

  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Failed to load timeline"
      fallbackMessage="An unexpected error occurred while loading timeline data."
    />
  );
}
