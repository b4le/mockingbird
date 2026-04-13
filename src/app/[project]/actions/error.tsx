"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";

export default function ActionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Actions error boundary caught:", error);
  }, [error]);

  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Failed to load actions"
      fallbackMessage="An unexpected error occurred while loading actions data."
    />
  );
}
