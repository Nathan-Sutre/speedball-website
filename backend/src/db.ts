import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "speedball.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

type TableInfoRow = {
  name: string;
  type: string;
  pk: number;
};

function tableExists(tableName: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;
  return Boolean(row);
}

function getTableInfo(tableName: string): TableInfoRow[] {
  if (!tableExists(tableName)) return [];
  return db.prepare(`PRAGMA table_info(${tableName})`).all() as TableInfoRow[];
}

function hasColumn(tableName: string, columnName: string): boolean {
  const info = getTableInfo(tableName);
  return info.some((column) => column.name === columnName);
}

function hasIntegerIdPk(tableName: string): boolean {
  const info = getTableInfo(tableName);
  const idColumn = info.find((column) => column.name === "id");
  if (!idColumn) return false;
  return idColumn.pk === 1 && idColumn.type.toUpperCase().includes("INT");
}

const legacySchemaDetected =
  tableExists("phases") ||
  tableExists("games") ||
  tableExists("last_games") ||
  (tableExists("matches") && !hasColumn("matches", "tournament_id")) ||
  (tableExists("matches") && !hasColumn("matches", "map_id")) ||
  (tableExists("matches") && !hasColumn("matches", "duration_seconds")) ||
  (tableExists("matches") && !hasColumn("matches", "blue_players")) ||
  (tableExists("matches") && !hasColumn("matches", "red_players")) ||
  (tableExists("tournaments") && !hasIntegerIdPk("tournaments"));

if (legacySchemaDetected) {
  db.exec(`
    DROP TABLE IF EXISTS player_stats;
    DROP TABLE IF EXISTS games;
    DROP TABLE IF EXISTS phases;
    DROP TABLE IF EXISTS last_games;
    DROP TABLE IF EXISTS matches;
    DROP TABLE IF EXISTS players;
    DROP TABLE IF EXISTS maps;
    DROP TABLE IF EXISTS teams;
    DROP TABLE IF EXISTS tournaments;
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'sbl',
    edition INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#f59e0b',
    logo TEXT NOT NULL DEFAULT '/team-placeholder.png'
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    login TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    image TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS team_competitions (
    team_id INTEGER NOT NULL,
    tournament_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, tournament_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    home_team_id INTEGER,
    away_team_id INTEGER,
    map_id INTEGER,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    blue_players TEXT NOT NULL DEFAULT '[]',
    red_players TEXT NOT NULL DEFAULT '[]',
    player_stats_json TEXT NOT NULL DEFAULT '[]',
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE SET NULL,
    FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_matches_played_at ON matches(played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_matches_map_id ON matches(map_id);
  CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
  CREATE INDEX IF NOT EXISTS idx_tournaments_type_edition ON tournaments(type, edition);
  CREATE INDEX IF NOT EXISTS idx_team_competitions_team_id ON team_competitions(team_id);
  CREATE INDEX IF NOT EXISTS idx_team_competitions_tournament_id ON team_competitions(tournament_id);
`);

if (!hasColumn("tournaments", "type")) {
  db.exec(
    "ALTER TABLE tournaments ADD COLUMN type TEXT NOT NULL DEFAULT 'sbl'",
  );
}

if (!hasColumn("tournaments", "edition")) {
  db.exec(
    "ALTER TABLE tournaments ADD COLUMN edition INTEGER NOT NULL DEFAULT 1",
  );
}

if (!hasColumn("matches", "player_stats_json")) {
  db.exec(
    "ALTER TABLE matches ADD COLUMN player_stats_json TEXT NOT NULL DEFAULT '[]'",
  );
}

export type TournamentRow = {
  id: number;
  name: string;
  date: string;
  type: "sbl" | "sbc" | "funcup" | "teamcup";
  edition: number;
};

export type TeamRow = {
  id: number;
  name: string;
  color: string;
  logo: string;
};

export type PlayerRow = {
  id: number;
  team_id: number;
  login: string;
  nickname: string;
  created_at: string;
};

export type MapRow = {
  id: number;
  name: string;
  image: string;
};

export type MatchRow = {
  id: number;
  tournament_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  map_id: number | null;
  duration_seconds: number;
  blue_players: string;
  red_players: string;
  player_stats_json?: string;
  home_score: number;
  away_score: number;
  played_at: string;
};

export type Tournament = TournamentRow;
export type Team = TeamRow;
export type Player = PlayerRow;
export type MapEntity = MapRow;
export type Match = MatchRow;

export type MatchApi = {
  id: number;
  tournament_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  map_id: number | null;
  duration_seconds: number;
  blue_players: string[];
  red_players: string[];
  home_score: number;
  away_score: number;
  played_at: string;
};

export function parseMatch(row: MatchRow): MatchApi {
  return {
    id: row.id,
    tournament_id: row.tournament_id,
    home_team_id: row.home_team_id,
    away_team_id: row.away_team_id,
    map_id: row.map_id,
    duration_seconds: row.duration_seconds,
    blue_players: JSON.parse(row.blue_players) as string[],
    red_players: JSON.parse(row.red_players) as string[],
    home_score: row.home_score,
    away_score: row.away_score,
    played_at: row.played_at,
  };
}
