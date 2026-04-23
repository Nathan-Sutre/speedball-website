import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

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

// ─── Migration from data.json ───────────────────────────────────────────────
const DATA_JSON = path.join(__dirname, "..", "..", "data", "data.json");

function migrate() {
  const tournamentCount = (
    db.prepare("SELECT COUNT(*) as c FROM tournaments").get() as { c: number }
  ).c;
  const teamCount = (
    db.prepare("SELECT COUNT(*) as c FROM teams").get() as { c: number }
  ).c;

  if (tournamentCount > 0 || teamCount > 0) return; // already migrated

  if (!fs.existsSync(DATA_JSON)) return;

  try {
    const raw = fs.readFileSync(DATA_JSON, "utf-8");
    const data = JSON.parse(raw) as {
      tournaments?: unknown[];
      teamStats?: unknown[];
    };

    const insertTournament = db.prepare(
      "INSERT OR IGNORE INTO tournaments (id, name, date, phases) VALUES (?, ?, ?, ?)",
    );
    const insertTeam = db.prepare(
      "INSERT OR IGNORE INTO teams (id, name, color, logo, players, competitions) VALUES (?, ?, ?, ?, ?, ?)",
    );

    const insertMany = db.transaction(() => {
      for (const t of data.tournaments ?? []) {
        const tournament = t as {
          id: string;
          name: string;
          date?: string;
          phases?: unknown[];
        };
        insertTournament.run(
          tournament.id,
          tournament.name,
          tournament.date ?? "",
          JSON.stringify(tournament.phases ?? []),
        );
      }

      for (const team of data.teamStats ?? []) {
        const t = team as {
          id: string;
          name: string;
          color?: string;
          logo?: string;
          players?: unknown[];
          competitions?: unknown[];
        };
        insertTeam.run(
          t.id,
          t.name,
          t.color ?? "#f59e0b",
          t.logo ?? "/team-placeholder.png",
          JSON.stringify(t.players ?? []),
          JSON.stringify(t.competitions ?? []),
        );
      }
    });

    insertMany();
    console.log("✅ Migrated data.json → SQLite");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

migrate();

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
