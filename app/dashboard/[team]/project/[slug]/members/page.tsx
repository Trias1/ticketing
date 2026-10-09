import MembersPage from "components/staff/project/MembersPage";
import { loadMemberProject } from "lib/server-project";

export default async function Page(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  const { user, project } = await loadMemberProject(params);
  return <MembersPage projectId={project.id} currentUserId={user.id} homeTeam={user.team} />;
}
