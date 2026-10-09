import { redirect } from "next/navigation";
import ProjectForm from "components/staff/ProjectForm";
import { getCurrentUser } from "lib/auth";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard/admin");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-tk-divider pb-5 dark:border-tk-dark-divider">
          <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
          <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">Projects hold issues, a board, labels, and members.</p>
        </div>
        <ProjectForm team={user.team} />
      </div>
    </div>
  );
}
