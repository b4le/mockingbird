import fs from "fs/promises";
import path from "path";

export async function getProjects(): Promise<string[]> {
  const dataDir = path.join(process.cwd(), "data");
  try {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    return entries
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

export async function getDefaultProject(): Promise<string> {
  const projects = await getProjects();
  if (projects.includes("demo")) return "demo";
  return projects[0] ?? "demo";
}
