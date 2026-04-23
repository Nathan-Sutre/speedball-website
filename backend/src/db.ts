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
