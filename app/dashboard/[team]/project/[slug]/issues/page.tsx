import { Suspense } from "react";
import IssuesView from "components/staff/project/IssuesView";
import { loadMemberProject } from "lib/server-project";

export default async function IssuesPage(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  const { user, project } = await loadMemberProject(params);
  return (
    <Suspense>
      <IssuesView projectId={project.id} currentUserId={user.id} />
    </Suspense>
  );
}
