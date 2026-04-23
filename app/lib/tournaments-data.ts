import data from "@/data/data.json";

export type TeamStats = {
  name: string;
  points: number;
  won: number;
  draw: number;
  lost: number;
  penalties: number;
  mapsWon: number;
  mapsLost: number;
  photo: string;
};

export type Phase = {
  name: string;
  teams: TeamStats[];
};

export type Tournament = {
  id: string;
  name: string;
  date: string;
  phases: Phase[];
};

export const tournaments: Tournament[] = data.tournaments as Tournament[];

export function getTournamentById(id: string): Tournament | undefined {
  return tournaments.find((tournament) => tournament.id === id);
}
