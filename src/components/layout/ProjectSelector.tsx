"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "mockingbird-project";

export function ProjectSelector({ projects }: { projects: string[] }) {
  const [selected, setSelected] = useState(projects[0] ?? "demo");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && projects.includes(stored)) {
      setSelected(stored);
    }
  }, [projects]);

  function handleSelect(project: string) {
    setSelected(project);
    localStorage.setItem(STORAGE_KEY, project);
    const url = new URL(window.location.href);
    url.searchParams.set("project", project);
    window.location.href = url.toString();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium capitalize hover:bg-accent hover:text-accent-foreground">
        {selected}
        <svg
          className="h-3.5 w-3.5 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {projects.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => handleSelect(p)}
            className="capitalize"
          >
            {p}
            {p === selected && (
              <svg
                className="ml-auto h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
