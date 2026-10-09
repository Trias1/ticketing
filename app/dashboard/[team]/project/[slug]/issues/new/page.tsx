import { Suspense } from "react";
import NewIssueForm from "components/staff/project/NewIssueForm";
import { loadMemberProject } from "lib/server-project";

export default async function NewIssuePage(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  const { project } = await loadMemberProject(params);
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 border-b border-tk-divider pb-4 dark:border-tk-dark-divider">
          <h1 className="text-2xl font-semibold tracking-tight">New issue</h1>
          <p className="mt-1 text-sm text-tk-muted dark:text-tk-dark-muted">in {project.name}</p>
        </div>
        <Suspense>
          <NewIssueForm projectId={project.id} />
        </Suspense>
      </div>
    </div>
  );
}
