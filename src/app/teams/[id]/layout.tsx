import { TeamLeagueScope } from "@/lib/leagueContext";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeamLeagueScope teamId={id}>{children}</TeamLeagueScope>;
}
