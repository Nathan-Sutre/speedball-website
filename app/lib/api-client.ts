/**
 * Centralized API client for the Speedball Stats frontend.
 * All calls go through the Express+SQLite backend.
 */

// Server-side (Next.js API routes, Server Components): use API_URL env var
// Client-side: use NEXT_PUBLIC_API_URL env var
export const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://localhost:3001")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");

// ─── Types (re-exported from lib files) ────────────────────────────────────
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

// ─── Tournament API ─────────────────────────────────────────────────────────
export async function fetchTournaments(): Promise<Tournament[]> {
  const res = await fetch(`${API_BASE}/api/tournaments`);
  if (!res.ok) throw new Error("Failed to fetch tournaments");
  return res.json() as Promise<Tournament[]>;
}

export async function fetchTournamentById(
  id: string,
): Promise<Tournament | null> {
  const res = await fetch(`${API_BASE}/api/tournaments/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch tournament");
  return res.json() as Promise<Tournament>;
}

export async function createTournament(body: {
  tournamentType: string;
  tournamentName: string;
  tournamentDate: string;
}): Promise<Tournament> {
  const res = await fetch(`${API_BASE}/api/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to create tournament");
  }
  return res.json() as Promise<Tournament>;
}

export async function updateTournament(
  id: string,
  body: Partial<Pick<Tournament, "name" | "date" | "phases">>,
): Promise<Tournament> {
  const res = await fetch(`${API_BASE}/api/tournaments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to update tournament");
  }
  return res.json() as Promise<Tournament>;
}

export async function deleteTournament(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tournaments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete tournament");
}

// ─── Team API ───────────────────────────────────────────────────────────────
export async function fetchTeams(): Promise<TeamProfile[]> {
  const res = await fetch(`${API_BASE}/api/teams`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json() as Promise<TeamProfile[]>;
}

export async function fetchTeamById(id: string): Promise<TeamProfile | null> {
  const res = await fetch(`${API_BASE}/api/teams/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json() as Promise<TeamProfile>;
}

export async function createTeam(formData: FormData): Promise<TeamProfile> {
  const res = await fetch(`${API_BASE}/api/teams`, {
    method: "POST",
    body: formData, // multipart
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to create team");
  }
  return res.json() as Promise<TeamProfile>;
}

export async function addCompetitionToTeam(
  teamId: string,
  competitionName: string,
  competitionType?: string,
): Promise<TeamProfile> {
  const res = await fetch(`${API_BASE}/api/teams/${teamId}/competitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ competitionName, competitionType }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to add competition");
  }
  return res.json() as Promise<TeamProfile>;
}

export async function deleteTeam(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/teams/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete team");
}

// ─── Convenience: full data dump ────────────────────────────────────────────
export async function fetchAllData(): Promise<{
  tournaments: Tournament[];
  teamStats: TeamProfile[];
  playerStats: unknown[];
  maps: unknown[];
}> {
  const res = await fetch(`${API_BASE}/api/data`);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json() as Promise<{
    tournaments: Tournament[];
    teamStats: TeamProfile[];
    playerStats: unknown[];
    maps: unknown[];
  }>;
}
