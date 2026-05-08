import fs from "fs/promises";
import path from "path";

// Folders inside `data/` that are scratch / staging and must never appear
// in the project selector or be rendered into static pages. `local` is
// the (gitignored) drop zone for the atticus-finch exporter; the
// publishable copy lives in `data/severance/` and is updated via
// `scripts/sync-severance.sh`. Without this exclusion, a developer
// running `npm run build` locally will trip schema drift in `local/`
// even when the publishable copy is clean.
const EXCLUDED_PROJECT_FOLDERS = new Set<string>(["local"]);

export async function getProjects(): Promise<string[]> {
  const dataDir = path.join(process.cwd(), "data");
  try {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    return entries
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => !EXCLUDED_PROJECT_FOLDERS.has(name))
      .sort();
  } catch {
    return [];
  }
}

// Order in which projects compete to be the landing page. The first
// match in `data/` wins. `severance` is the publicly shared real-world
// example and takes precedence when present; `demo` is the synthetic
// fallback used in CI and on a clean checkout.
const DEFAULT_PROJECT_PREFERENCE = ["severance", "demo"] as const;

export async function getDefaultProject(): Promise<string> {
  const projects = await getProjects();
  for (const candidate of DEFAULT_PROJECT_PREFERENCE) {
    if (projects.includes(candidate)) return candidate;
  }
  return projects[0] ?? "demo";
}
