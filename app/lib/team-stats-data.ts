export type {
  CompetitionType,
  TeamMatch,
  TeamMapStat,
  TeamCompetition,
  TeamProfile,
} from "./api-client";

export { fetchTeams, fetchTeamById } from "./api-client";

export function getCompetitionTypeLabel(type: string): string {
  if (type === "sbl") return "SBL";
  if (type === "sbc") return "SBC";
  if (type === "funcup") return "FunCup";
  return "TeamCup";
}

export function getMapWinRatePercent(
  wonCount: number,
  playedCount: number,
): string {
  if (playedCount === 0) return "0%";
  return `${((wonCount / playedCount) * 100).toFixed(1)}%`;
}
