"use client";

import { ProjectSelector } from "./ProjectSelector";
import { ThemeToggle } from "./ThemeToggle";

export function MobileHeader({ projects }: { projects: string[] }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <span className="text-lg font-semibold tracking-tight">mockingbird</span>
      <div className="flex items-center gap-2">
        <ProjectSelector projects={projects} />
        <ThemeToggle />
      </div>
    </header>
  );
}
