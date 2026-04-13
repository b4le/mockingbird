"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
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
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
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
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
