import { notFound } from "next/navigation";
import IssueDetail from "components/staff/project/IssueDetail";
import { loadMemberProject } from "lib/server-project";

export default async function IssuePage(props: { params: Promise<{ team: string; slug: string; number: string }> }) {
  const params = await props.params;
  const { user, project } = await loadMemberProject(params);
  const number = Number(params.number);
  if (!Number.isInteger(number) || number < 1) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <IssueDetail projectId={project.id} number={number} mode="page" currentUserId={user.id} />
    </div>
  );
}
