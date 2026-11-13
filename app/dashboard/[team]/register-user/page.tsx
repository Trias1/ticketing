import { redirect } from "next/navigation";
import RegisterUserForm from "components/register/RegisterUserForm";
import { getCurrentUser } from "lib/auth";
import { isSuperadmin, managesPeople } from "lib/roles";
import { teamsWithoutAdmin } from "lib/teams";

// Superadmin (di /dashboard/superadmin) atau admin tim (di /dashboard/{timnya}).
export default async function RegisterUserPage(props: { params: Promise<{ team: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!managesPeople(user) || params.team !== user.team) redirect(`/dashboard/${user.team}`);
  // Superadmin bisa memasukkan admin baru ke tim yang belum punya admin.
  const openTeams = isSuperadmin(user) ? await teamsWithoutAdmin() : [];
  return <RegisterUserForm viewer={{ role: user.role, team: user.team }} openTeams={openTeams} />;
}
