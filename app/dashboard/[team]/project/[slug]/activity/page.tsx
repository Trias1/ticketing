import ActivityPage from "components/staff/project/ActivityPage";
import { loadMemberProject } from "lib/server-project";

export default async function Page(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  const { project } = await loadMemberProject(params);
  return <ActivityPage projectId={project.id} />;
}
