"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Home,
  Clock,
  FileText,
  CheckCircle,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: <Home className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/timeline",
    label: "Timeline",
    icon: <Clock className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/evidence",
    label: "Evidence",
    icon: <FileText className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/actions",
    label: "Actions",
    icon: <CheckCircle className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/communications",
    label: "Comms",
    icon: <MessageSquare className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/conversations",
    label: "Convs",
    icon: <MessagesSquare className="h-5 w-5" aria-hidden="true" />,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const params = useParams();
  const project = params.project as string | undefined;

  if (!project) return null;

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const fullHref = item.href === "/" ? `/${project}` : `/${project}${item.href}`;
          const isActive = pathname === fullHref;
          return (
            <Link
              key={item.href}
              href={fullHref}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
