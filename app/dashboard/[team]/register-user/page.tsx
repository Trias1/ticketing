import { redirect } from "next/navigation";
import RegisterUserForm from "components/register/RegisterUserForm";
import { getCurrentUser } from "lib/auth";
import { managesPeople } from "lib/roles";

// Superadmin (di /dashboard/superadmin) atau admin tim (di /dashboard/{timnya}).
export default async function RegisterUserPage(props: { params: Promise<{ team: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!managesPeople(user) || params.team !== user.team) redirect(`/dashboard/${user.team}`);
  return <RegisterUserForm viewer={{ role: user.role, team: user.team }} />;
}
