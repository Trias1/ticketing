import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "lib/auth";
import { findProjectForMember } from "lib/project-access";

// Untuk halaman project (server component): user harus login dan jadi member project ini.
export async function loadMemberProject(params: { team: string; slug: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard/admin");

  const found = await findProjectForMember(params.team, params.slug, user.id);
  if (!found) notFound();

  return { user, project: found.project, role: found.role };
}
