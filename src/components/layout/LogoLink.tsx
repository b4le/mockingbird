"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export function LogoLink() {
  const { project } = useParams<{ project: string }>();
  const href = project ? `/${project}` : "/";

  return (
    <Link href={href} className="text-lg font-semibold tracking-tight">
      mockingbird
    </Link>
  );
}
