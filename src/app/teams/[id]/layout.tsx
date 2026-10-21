import { TeamLeagueScope } from "@/lib/leagueContext";
import { TeamColorScope } from "@/lib/teamColorContext";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <TeamLeagueScope teamId={id}>
      <TeamColorScope teamId={id}>{children}</TeamColorScope>
    </TeamLeagueScope>
  );
}

