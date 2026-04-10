import fs from "fs";
import path from "path";

export function getProjects(): string[] {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function getDefaultProject(): string {
  const projects = getProjects();
  if (projects.includes("demo")) return "demo";
  return projects[0] ?? "demo";
}
