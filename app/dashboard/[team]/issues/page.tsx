import { Suspense } from "react";
import { redirect } from "next/navigation";
import MyIssues from "components/staff/MyIssues";
import { getCurrentUser } from "lib/auth";
import { SUPERADMIN_HOME, worksInProjects } from "lib/roles";

export default async function MyIssuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!worksInProjects(user)) redirect(SUPERADMIN_HOME);
  return (
    <Suspense>
      <MyIssues />
    </Suspense>
  );
}
