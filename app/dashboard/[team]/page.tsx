import DashboardContent from "components/dashboard/DashboardContent";

type Props = {
  params: Promise<{ team: string }>;
};

export default async function Page({ params }: Props) {
  const { team } = await params;
  return <DashboardContent team={team} />;
}
