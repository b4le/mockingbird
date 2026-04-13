"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
  children?: React.ReactNode;
}

export function NavLink({ href, label, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive
          ? "border-b-2 bg-accent text-accent-foreground"
          : "text-muted-foreground"
      )}
    >
      {children ?? label}
    </Link>
  );
}
