import { Suspense } from "react";
import { redirect } from "next/navigation";
import MyIssues from "components/staff/MyIssues";
import { getCurrentUser } from "lib/auth";

export default async function MyIssuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard/admin");
  return (
    <Suspense>
      <MyIssues />
    </Suspense>
  );
}
