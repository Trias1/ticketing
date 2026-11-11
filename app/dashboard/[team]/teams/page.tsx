import { redirect } from "next/navigation";
import TeamsPage from "components/admin/TeamsPage";
import { SUPERADMIN_TEAM } from "lib/roles";

// Daftar tim, khusus area superadmin (/dashboard/superadmin/teams).
export default async function Teams(props: { params: Promise<{ team: string }> }) {
  const params = await props.params;
  if (params.team !== SUPERADMIN_TEAM) redirect(`/dashboard/${params.team}`);
  return <TeamsPage />;
}
