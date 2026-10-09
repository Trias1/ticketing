import { redirect } from "next/navigation";

export default async function LegacyNewTicket(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  redirect(`/dashboard/${params.team}/project/${params.slug}/issues/new`);
}
