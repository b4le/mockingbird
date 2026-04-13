"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProjectSelector({ projects }: { projects: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const selected = (params.project as string) ?? projects[0] ?? "demo";

  function handleSelect(project: string) {
    const segments = pathname.split("/");
    const subPath = segments.slice(2).join("/");
    router.push(`/${project}${subPath ? `/${subPath}` : ""}`);
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
            {p === selected && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
