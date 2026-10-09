import { redirect } from "next/navigation";
import ProjectsPage from "components/staff/ProjectsPage";
import { getCurrentUser } from "lib/auth";

export default async function Projects() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard/admin");
  return <ProjectsPage homeTeam={user.team} />;
}
