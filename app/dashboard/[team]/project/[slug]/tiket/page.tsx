import { redirect } from "next/navigation";

// URL lama board tiket: arahkan ke Issues tampilan Board.
export default async function LegacyBoard(props: { params: Promise<{ team: string; slug: string }> }) {
  const params = await props.params;
  redirect(`/dashboard/${params.team}/project/${params.slug}/issues?view=board`);
}
