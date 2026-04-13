"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Something went wrong"
      fallbackMessage="An unexpected error occurred while loading the dashboard."
    />
  );
}
