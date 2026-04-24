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
export type CompetitionType = "sbl" | "sbc" | "funcup" | "teamcup";
export type TournamentType = "sbl" | "sbc" | "funcup" | "teamcup";
export type TournamentFilterType = TournamentType | "public" | "all";

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
  id: number;
  name: string;
  date: string;
  type: TournamentType;
  edition: number;
  phases: Phase[];
};

export type PlayerStatsRow = {
  login: string;
  nickname: string;
  rank: number;
  ladderPoints: number;
  points: number;
  damage: number;
  shots: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  accuracy: string;
  passesDone: number;
  passesReceived: number;
  ballHits: number;
  backstabs: number;
  backspaced: number;
  ballGivenAway: number;
  ballStolen: number;
  ballPossession: string;
  nearMisses: number;
  captureTries: number;
  captures: number;
  captureTotalPercent: string;
  captureTotalTime: string;
  playtime: string;
  mapsPlayed: number;
  wonMap: number;
};

export type PlayerMatchStatsRaw = {
  match_id: number;
  tournament_id: number | null;
  tournament_name: string | null;
  tournament_type: TournamentType | "public" | null;
  tournament_edition: number | null;
  duration_seconds: number;
  login: string;
  nickname?: string;
  team?: string;
  points?: number;
  damage?: number;
  ballHits?: number;
  kills?: number;
  deaths?: number;
  kdRatio?: number;
  accuracy?: number;
  shots?: number;
  passes?: number;
  catches?: number;
  backstabs?: number;
  backspaced?: number;
  ballGivenAway?: number;
  ballStolen?: number;
  ballPossession?: number;
  nearMisses?: number;
  captureTries?: number;
  caps?: number;
  capPercent?: number;
  capSec?: number;
};

export type MapStatsRow = {
  mapId: number;
  mapName: string;
  playedCount: number;
  wonCount: number;
  blueWins: number;
  redWins: number;
  draws: number;
  pickedCount: number;
  bannedCount: number;
  wonWhenPickedCount: number;
  wonWhenNotPickedCount: number;
};

function buildFilterQuery(filter?: {
  type?: TournamentFilterType;
  edition?: number | null;
}): string {
  const params = new URLSearchParams();
  if (filter?.type) params.set("type", filter.type);
  if (typeof filter?.edition === "number" && filter.edition > 0) {
    params.set("edition", String(filter.edition));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function withDefaultPhases<T extends { phases?: Phase[] }>(
  row: T,
): T & {
  phases: Phase[];
} {
  return { ...row, phases: row.phases ?? [] };
}

// ─── Tournament API ─────────────────────────────────────────────────────────
export async function fetchTournaments(filter?: {
  type?: TournamentFilterType;
  edition?: number | null;
}): Promise<Tournament[]> {
  const res = await fetch(
    `${API_BASE}/api/tournaments/GetAll${buildFilterQuery(filter)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch tournaments");
  const rows = (await res.json()) as Array<Omit<Tournament, "phases">>;
  return rows.map((row) => withDefaultPhases(row));
}

export async function fetchTournamentById(
  id: string | number,
): Promise<Tournament | null> {
  const res = await fetch(`${API_BASE}/api/tournaments/GetOne/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch tournament");
  const row = (await res.json()) as Omit<Tournament, "phases">;
  return withDefaultPhases(row);
}

export async function fetchTournamentEditions(
  type: TournamentType,
): Promise<number[]> {
  const res = await fetch(`${API_BASE}/api/tournaments/editions?type=${type}`);
  if (!res.ok) throw new Error("Failed to fetch tournament editions");
  return res.json() as Promise<number[]>;
}

export async function fetchTournamentFullById(id: string): Promise<{
  tournament: Tournament;
  teams: TeamProfile[];
} | null> {
  const tournament = await fetchTournamentById(id);
  if (!tournament) return null;

  const teams = await fetchTeams();
  return { tournament, teams };
}

export async function createTournament(body: {
  tournamentType: TournamentType;
  tournamentName: string;
  tournamentDate: string;
  edition: number;
}): Promise<Tournament> {
  const res = await fetch(`${API_BASE}/api/tournaments/CreateOne`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: body.tournamentType,
      name: body.tournamentName,
      date: body.tournamentDate,
      edition: body.edition,
    }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to create tournament");
  }
  const row = (await res.json()) as Omit<Tournament, "phases">;
  return withDefaultPhases(row);
}

export async function updateTournament(
  id: string | number,
  body: Partial<
    Pick<Tournament, "name" | "date" | "type" | "edition" | "phases">
  >,
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
  const row = (await res.json()) as Omit<Tournament, "phases">;
  return withDefaultPhases(row);
}

export async function deleteTournament(id: string | number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tournaments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete tournament");
}

// ─── Team API ───────────────────────────────────────────────────────────────
export async function fetchTeams(): Promise<TeamProfile[]> {
  const res = await fetch(`${API_BASE}/api/teams/GetAll`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  const rows = (await res.json()) as Array<{
    id: number;
    name: string;
    color: string;
    logo: string;
  }>;

  const playersRes = await fetch(`${API_BASE}/api/players/GetAll`);
  const players = playersRes.ok
    ? ((await playersRes.json()) as Array<{ team_id: number; login: string }>)
    : [];

  const teams = await Promise.all(
    rows.map(async (row) => {
      const competitionsRes = await fetch(
        `${API_BASE}/api/teams/${row.id}/competitions`,
      );

      const linkedCompetitions = competitionsRes.ok
        ? ((await competitionsRes.json()) as Array<{
            id: number;
            name: string;
            type: CompetitionType;
            edition: number;
          }>)
        : [];

      return {
        id: String(row.id),
        name: row.name,
        color: row.color,
        logo: row.logo,
        players: players
          .filter((player) => player.team_id === row.id)
          .map((player) => player.login),
        competitions: linkedCompetitions.map((competition) => ({
          id: String(competition.id),
          name: competition.name,
          type: competition.type,
          matches: [],
          mapStats: [],
        })),
      } satisfies TeamProfile;
    }),
  );

  return teams;
}

export async function fetchTeamById(id: string): Promise<TeamProfile | null> {
  const teamRes = await fetch(`${API_BASE}/api/teams/GetOne/${id}`);
  if (teamRes.status === 404) return null;
  if (!teamRes.ok) throw new Error("Failed to fetch team");

  const team = (await teamRes.json()) as {
    id: number;
    name: string;
    color: string;
    logo: string;
  };

  const playersRes = await fetch(`${API_BASE}/api/players/GetAll`);
  const players = playersRes.ok
    ? (
        (await playersRes.json()) as Array<{ team_id: number; login: string }>
      ).filter((item) => item.team_id === team.id)
    : [];

  const competitionsRes = await fetch(
    `${API_BASE}/api/teams/${team.id}/competitions`,
  );
  const linkedCompetitions = competitionsRes.ok
    ? ((await competitionsRes.json()) as Array<{
        id: number;
        name: string;
        type: CompetitionType;
        edition: number;
      }>)
    : [];

  const competitions = await Promise.all(
    linkedCompetitions.map(async (competition) => {
      const matchesRes = await fetch(
        `${API_BASE}/api/matches/${competition.id}/GetAll`,
      );

      type BackendMatch = {
        id: number;
        home_team_id: number | null;
        away_team_id: number | null;
        home_score: number;
        away_score: number;
        map_name: string | null;
        home_team_name: string | null;
        away_team_name: string | null;
      };

      const backendMatches = matchesRes.ok
        ? ((await matchesRes.json()) as BackendMatch[])
        : [];

      const teamMatches = backendMatches.filter(
        (match) =>
          match.home_team_id === team.id || match.away_team_id === team.id,
      );

      const matches: TeamMatch[] = teamMatches.map((match) => {
        const isHome = match.home_team_id === team.id;
        const scoreFor = isHome ? match.home_score : match.away_score;
        const scoreAgainst = isHome ? match.away_score : match.home_score;
        const opponent = isHome
          ? (match.away_team_name ?? "Unknown")
          : (match.home_team_name ?? "Unknown");

        return {
          id: String(match.id),
          opponent,
          map: match.map_name ?? "Unknown",
          scoreFor,
          scoreAgainst,
          pickedByTeam: false,
          result: scoreFor >= scoreAgainst ? "win" : "loss",
        };
      });

      const mapStatsByName = new Map<string, TeamMapStat>();
      for (const match of matches) {
        const current = mapStatsByName.get(match.map) ?? {
          mapName: match.map,
          pickedCount: 0,
          bannedCount: 0,
          playedCount: 0,
          wonCount: 0,
          wonWhenPickedCount: 0,
          wonWhenNotPickedCount: 0,
        };

        current.playedCount += 1;
        if (match.result === "win") {
          current.wonCount += 1;
          current.wonWhenNotPickedCount += 1;
        }

        mapStatsByName.set(match.map, current);
      }

      return {
        id: String(competition.id),
        name: competition.name,
        type: competition.type,
        matches,
        mapStats: Array.from(mapStatsByName.values()),
      } satisfies TeamCompetition;
    }),
  );

  return {
    id: String(team.id),
    name: team.name,
    color: team.color,
    logo: team.logo,
    players: players.map((p) => p.login),
    competitions,
  };
}

export async function createTeam(formData: FormData): Promise<TeamProfile> {
  const teamName = String(formData.get("teamName") ?? "").trim();
  const teamColor = String(formData.get("teamColor") ?? "").trim();
  const teamPhoto = String(formData.get("teamPhoto") ?? "").trim();

  const res = await fetch(`${API_BASE}/api/teams/CreateOne`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: teamName,
      color: teamColor || undefined,
      logo: teamPhoto || undefined,
    }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to create team");
  }

  const team = (await res.json()) as {
    id: number;
    name: string;
    color: string;
    logo: string;
  };

  return {
    id: String(team.id),
    name: team.name,
    color: team.color,
    logo: team.logo,
    players: [],
    competitions: [],
  };
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

export async function addTournamentToTeam(
  teamId: string,
  tournamentId: number,
): Promise<{
  id: number;
  name: string;
  type: CompetitionType;
  edition: number;
}> {
  const res = await fetch(`${API_BASE}/api/teams/${teamId}/competitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tournamentId }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to add team to tournament");
  }

  return res.json() as Promise<{
    id: number;
    name: string;
    type: CompetitionType;
    edition: number;
  }>;
}

export async function deleteTeam(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/teams/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete team");
}

// ─── Player/Map stats API ───────────────────────────────────────────────────
export async function fetchPlayerStats(filter?: {
  type?: TournamentFilterType;
  edition?: number | null;
}): Promise<PlayerStatsRow[]> {
  const res = await fetch(
    `${API_BASE}/api/player-stats/GetAll${buildFilterQuery(filter)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch player stats");
  return res.json() as Promise<PlayerStatsRow[]>;
}

export async function fetchPlayerStatsRaw(filter?: {
  type?: TournamentFilterType;
  tournamentId?: number | null;
}): Promise<PlayerMatchStatsRaw[]> {
  const params = new URLSearchParams();
  if (filter?.type) params.set("type", filter.type);
  if (typeof filter?.tournamentId === "number" && filter.tournamentId > 0) {
    params.set("tournamentId", String(filter.tournamentId));
  }
  const query = params.toString();
  const res = await fetch(
    `${API_BASE}/api/player-stats/GetRaw${query ? `?${query}` : ""}`,
  );
  if (!res.ok) throw new Error("Failed to fetch raw player stats");
  return res.json() as Promise<PlayerMatchStatsRaw[]>;
}

export async function fetchMapStats(filter?: {
  type?: TournamentFilterType;
  edition?: number | null;
}): Promise<MapStatsRow[]> {
  const res = await fetch(
    `${API_BASE}/api/maps-stats/GetAll${buildFilterQuery(filter)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch map stats");
  return res.json() as Promise<MapStatsRow[]>;
}

// ─── Convenience: full data dump ────────────────────────────────────────────
export async function fetchAllData(): Promise<{
  tournaments: Tournament[];
  teamStats: TeamProfile[];
  playerStats: PlayerStatsRow[];
  maps: MapStatsRow[];
}> {
  const [tournaments, teamStats, playerStats, maps] = await Promise.all([
    fetchTournaments(),
    fetchTeams(),
    fetchPlayerStats(),
    fetchMapStats(),
  ]);
  return { tournaments, teamStats, playerStats, maps };
}
