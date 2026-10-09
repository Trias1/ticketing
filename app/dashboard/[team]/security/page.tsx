import { redirect } from "next/navigation";
import AdminSecurity from "components/admin/AdminSecurity";

// Halaman keamanan akun, khusus area admin (/dashboard/admin/security).
export default async function SecurityPage(props: { params: Promise<{ team: string }> }) {
  const params = await props.params;
  if (params.team !== "admin") redirect(`/dashboard/${params.team}`);
  return <AdminSecurity />;
}
