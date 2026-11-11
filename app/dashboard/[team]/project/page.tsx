import { redirect } from "next/navigation";
import ProjectsPage from "components/staff/ProjectsPage";
import { getCurrentUser } from "lib/auth";
import { SUPERADMIN_HOME, worksInProjects } from "lib/roles";

export default async function Projects() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!worksInProjects(user)) redirect(SUPERADMIN_HOME);
  return <ProjectsPage homeTeam={user.team} />;
}
