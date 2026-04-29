"use client";

interface LiveRegionProps {
  message: string;
}

// Polite, atomic live region rendered visually hidden. Consumers update the
// `message` to trigger an AT announcement; an empty string leaves the region
// silent.
export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="transcript-live-region"
      className="sr-only"
    >
      {message}
    </div>
  );
}
