"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-xl bg-destructive/10 p-4">
        <AlertCircle className="mx-auto size-8 text-destructive" />
      </div>
      <h2 className="text-lg font-medium text-foreground">
        Failed to load project
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading this project."}
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
