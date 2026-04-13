"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Project error boundary caught:", error);
  }, [error]);

  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Failed to load project"
      fallbackMessage="An unexpected error occurred while loading this project."
    />
  );
}
