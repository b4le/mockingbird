"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const params = useParams();
  const project = params.project as string | undefined;

  // When there's no project context (e.g. the root redirect page),
  // avoid constructing broken paths like "//timeline".
  if (!project) return null;

  const fullHref = href === "/" ? `/${project}` : `/${project}${href}`;
  const isActive = pathname === fullHref;

  return (
    <Link
      href={fullHref}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive
          ? "bg-accent text-accent-foreground border-b-2 border-primary"
          : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );
}
