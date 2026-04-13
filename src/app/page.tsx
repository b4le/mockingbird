import { redirect } from "next/navigation";
import { getDefaultProject } from "@/lib/projects";

export default async function RootPage() {
  redirect(`/${await getDefaultProject()}`);
}
