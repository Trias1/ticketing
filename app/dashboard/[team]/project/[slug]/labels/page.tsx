import LabelsPage from "components/staff/project/LabelsPage";
import { loadMemberProject } from "lib/server-project";

export default async function Page(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  const { project } = await loadMemberProject(params);
  return <LabelsPage projectId={project.id} />;
}
