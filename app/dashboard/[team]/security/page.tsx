import { redirect } from "next/navigation";
import AdminSecurity from "components/admin/AdminSecurity";
import { SUPERADMIN_TEAM } from "lib/roles";

// Halaman keamanan akun, khusus area superadmin (/dashboard/superadmin/security).
export default async function SecurityPage(props: { params: Promise<{ team: string }> }) {
  const params = await props.params;
  if (params.team !== SUPERADMIN_TEAM) redirect(`/dashboard/${params.team}`);
  return <AdminSecurity />;
}
