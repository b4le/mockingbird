import { redirect } from "next/navigation";
import { getDefaultProject } from "@/lib/projects";

export default function RootPage() {
  redirect(`/${getDefaultProject()}`);
}
