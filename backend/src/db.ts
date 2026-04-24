import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "speedball.db");

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    date  TEXT NOT NULL DEFAULT '',
    phases TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS teams (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    color        TEXT NOT NULL DEFAULT '#f59e0b',
    logo         TEXT NOT NULL DEFAULT '/team-placeholder.png',
    players      TEXT NOT NULL DEFAULT '[]',
    competitions TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS maps (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE,
    image TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS phases (
    id            TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    name          TEXT NOT NULL,
    phase_order   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id             TEXT PRIMARY KEY,
    phase_id       TEXT NOT NULL,
    match_order    INTEGER NOT NULL DEFAULT 0,
    home_team_name TEXT NOT NULL DEFAULT '',
    away_team_name TEXT NOT NULL DEFAULT '',
    home_score     INTEGER,
    away_score     INTEGER,
    payload        TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS players (
    id         TEXT PRIMARY KEY,
    team_id    TEXT,
    login      TEXT NOT NULL UNIQUE,
    nickname   TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS player_stats (
    id            TEXT PRIMARY KEY,
    player_id     TEXT NOT NULL,
    tournament_id TEXT,
    phase_id      TEXT,
    match_id      TEXT,
    stat_key      TEXT NOT NULL,
    stat_value    REAL NOT NULL DEFAULT 0,
    recorded_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
    FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_phases_tournament ON phases(tournament_id, phase_order);
  CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase_id, match_order);
  CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
  CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
  CREATE INDEX IF NOT EXISTS idx_player_stats_scope ON player_stats(tournament_id, phase_id, match_id);
`);

// ─── Row helpers ───────────────────────────────────────────────────────────
export type TournamentRow = {
  id: string;
  name: string;
  date: string;
  phases: string;
};

export type TeamRow = {
  id: string;
  name: string;
  color: string;
  logo: string;
  players: string;
  competitions: string;
};

export type PhaseRow = {
  id: string;
  tournament_id: string;
  name: string;
  phase_order: number;
};

export type MatchRow = {
  id: string;
  phase_id: string;
  match_order: number;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  payload: string;
};

export type PlayerRow = {
  id: string;
  team_id: string | null;
  login: string;
  nickname: string;
  created_at: string;
};

export type PlayerStatRow = {
  id: string;
  player_id: string;
  tournament_id: string | null;
  phase_id: string | null;
  match_id: string | null;
  stat_key: string;
  stat_value: number;
  recorded_at: string;
};

export function parseTournament(row: TournamentRow) {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    phases: JSON.parse(row.phases) as unknown[],
  };
}

export function parseTeam(row: TeamRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    logo: row.logo,
    players: JSON.parse(row.players) as string[],
    competitions: JSON.parse(row.competitions) as unknown[],
  };
}

export function parsePhase(row: PhaseRow) {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    order: row.phase_order,
  };
}

export function parseMatch(row: MatchRow) {
  return {
    id: row.id,
    phaseId: row.phase_id,
    order: row.match_order,
    homeTeamName: row.home_team_name,
    awayTeamName: row.away_team_name,
    homeScore: row.home_score,
    awayScore: row.away_score,
    payload: JSON.parse(row.payload) as unknown,
  };
}

export function parsePlayer(row: PlayerRow) {
  return {
    id: row.id,
    teamId: row.team_id,
    login: row.login,
    nickname: row.nickname,
    createdAt: row.created_at,
  };
}

export function parsePlayerStat(row: PlayerStatRow) {
  return {
    id: row.id,
    playerId: row.player_id,
    tournamentId: row.tournament_id,
    phaseId: row.phase_id,
    matchId: row.match_id,
    key: row.stat_key,
    value: row.stat_value,
    recordedAt: row.recorded_at,
  };
}
