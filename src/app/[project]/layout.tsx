import { getProjects } from "@/lib/projects";

export async function generateStaticParams() {
  return getProjects().map((project) => ({ project }));
}

export const dynamicParams = false;

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
