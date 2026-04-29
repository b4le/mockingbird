"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";

export default function ConversationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Conversations error boundary caught:", error);
  }, [error]);

  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Failed to load conversations"
      fallbackMessage="An unexpected error occurred while loading conversations data."
    />
  );
}
