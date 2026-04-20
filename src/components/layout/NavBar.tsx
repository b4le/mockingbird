import { LogoLink } from "./LogoLink";
import { NavLink } from "./NavLink";
import { ProjectSelector } from "./ProjectSelector";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/timeline", label: "Timeline" },
  { href: "/evidence", label: "Evidence" },
  { href: "/actions", label: "Actions" },
  { href: "/communications", label: "Communications" },
];

export function NavBar({ projects }: { projects: string[] }) {
  return (
    <header className="sticky top-0 z-40 hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <LogoLink />
        <ProjectSelector projects={projects} />
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
