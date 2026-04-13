import { getProjects } from "@/lib/projects";
import { getSession } from "@/lib/data";

export async function generateStaticParams() {
  return (await getProjects()).map((project) => ({ project }));
}

export const dynamicParams = false;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  let lastUpdated: string | null = null;
  try {
    const session = await getSession(project);
    lastUpdated = session.lastUpdated;
  } catch {
    // Session data unavailable — skip footer timestamp
  }

  return (
    <>
      {children}
      <footer className="mx-auto w-full max-w-7xl border-t px-4 py-4 text-xs text-muted-foreground">
        <p>
          Mockingbird &middot; {project}
          {lastUpdated && (
            <>
              {" "}&middot; Last updated{" "}
              {new Date(lastUpdated).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </>
          )}
        </p>
      </footer>
    </>
  );
}
