import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "lib/auth";
import { findProjectForMember } from "lib/project-access";
import { SUPERADMIN_HOME, worksInProjects } from "lib/roles";

// Untuk halaman project (server component): user harus login dan jadi member project ini.
export async function loadMemberProject(params: { team: string; slug: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!worksInProjects(user)) redirect(SUPERADMIN_HOME);

  const found = await findProjectForMember(params.team, params.slug, user.id);
  if (!found) notFound();

  return { user, project: found.project, role: found.role };
}
