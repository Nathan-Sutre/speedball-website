import data from "@/data/data.json";

export type CompetitionType = "sbl" | "sbc" | "teamcup";

export type TeamMatch = {
  id: string;
  opponent: string;
  map: string;
  scoreFor: number;
  scoreAgainst: number;
  pickedByTeam: boolean;
  result: "win" | "loss";
};

export type TeamMapStat = {
  mapName: string;
  pickedCount: number;
  bannedCount: number;
  playedCount: number;
  wonCount: number;
  wonWhenPickedCount: number;
  wonWhenNotPickedCount: number;
};

export type TeamCompetition = {
  id: string;
  name: string;
  type: CompetitionType;
  matches: TeamMatch[];
  mapStats: TeamMapStat[];
};

export type TeamProfile = {
  id: string;
  name: string;
  color: string;
  logo: string;
  players: string[];
  competitions: TeamCompetition[];
};

export const teamsStatsData: TeamProfile[] = data.teamStats as TeamProfile[];

export function getTeamById(teamId: string): TeamProfile | undefined {
  return teamsStatsData.find((team) => team.id === teamId);
}

export function getTeamCompetitionById(
  teamId: string,
  competitionId: string,
): TeamCompetition | undefined {
  const team = getTeamById(teamId);
  if (!team) {
    return undefined;
  }

  return team.competitions.find(
    (competition) => competition.id === competitionId,
  );
}

export function getCompetitionTypeLabel(type: CompetitionType): string {
  if (type === "sbl") {
    return "SBL";
  }

  if (type === "sbc") {
    return "SBC";
  }

  return "TeamCup";
}

export function getMapWinRatePercent(
  wonCount: number,
  playedCount: number,
): string {
  if (playedCount === 0) {
    return "0%";
  }

  const ratio = (wonCount / playedCount) * 100;
  return `${ratio.toFixed(1)}%`;
}
