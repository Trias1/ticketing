import SettingsPage from "components/staff/project/SettingsPage";
import { loadMemberProject } from "lib/server-project";

export default async function Page(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  const { user, project } = await loadMemberProject(params);
  return <SettingsPage projectId={project.id} homeTeam={user.team} />;
}
