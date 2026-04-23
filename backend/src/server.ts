import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, parseTournament, parseTeam, TournamentRow, TeamRow } from "./db";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ─── Static files (team logos) ────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "teams");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── Multer (file uploads) ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const teamId =
      (req.body?.teamId as string | undefined) ?? Date.now().toString();
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${teamId}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Helpers ───────────────────────────────────────────────────────────────
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function detectCompetitionType(name: string): "sbl" | "sbc" | "teamcup" {
  const lower = name.toLowerCase();
  if (lower.includes("sbc") || lower.includes("championship")) return "sbc";
  if (lower.includes("teamcup")) return "teamcup";
  return "sbl";
}

// ─── GET /api/data ─────────────────────────────────────────────────────────
app.get("/api/data", (_req: Request, res: Response) => {
  const tournaments = (
    db.prepare("SELECT * FROM tournaments").all() as TournamentRow[]
  ).map(parseTournament);
  const teamStats = (db.prepare("SELECT * FROM teams").all() as TeamRow[]).map(
    parseTeam,
  );
  res.json({ tournaments, teamStats, maps: [], playerStats: [] });
});

// ─── Tournaments ───────────────────────────────────────────────────────────
app.get("/api/tournaments", (_req: Request, res: Response) => {
  const rows = db
    .prepare("SELECT * FROM tournaments ORDER BY date DESC")
    .all() as TournamentRow[];
  res.json(rows.map(parseTournament));
});

app.get("/api/tournaments/:id/full", (req: Request, res: Response) => {
  const row = db
    .prepare("SELECT * FROM tournaments WHERE id = ?")
    .get(req.params.id) as TournamentRow | undefined;

  if (!row) return void res.status(404).json({ error: "Tournament not found" });

  const tournament = parseTournament(row) as {
    id: string;
    name: string;
    date: string;
    phases: Array<{ teams?: Array<{ name?: string }> }>;
  };

  const normalize = (value: string) => value.trim().toLowerCase();
  const phaseTeamNames = new Set(
    tournament.phases.flatMap((phase) =>
      (phase.teams ?? [])
        .map((team) => (team?.name ? normalize(team.name) : ""))
        .filter(Boolean),
    ),
  );

  const teamRows = db.prepare("SELECT * FROM teams").all() as TeamRow[];
  const teams = teamRows.map(parseTeam).filter((team) => {
    const inPhase = phaseTeamNames.has(normalize(team.name));
    const competitions = (team.competitions as Array<{ name?: string }>) ?? [];
    const inCompetition = competitions.some(
      (competition) =>
        typeof competition?.name === "string" &&
        normalize(competition.name) === normalize(tournament.name),
    );
    return inPhase || inCompetition;
  });

  res.json({ tournament, teams });
});

app.get("/api/tournaments/:id", (req: Request, res: Response) => {
  const row = db
    .prepare("SELECT * FROM tournaments WHERE id = ?")
    .get(req.params.id) as TournamentRow | undefined;
  if (!row) return void res.status(404).json({ error: "Tournament not found" });
  res.json(parseTournament(row));
});

app.post("/api/tournaments", (req: Request, res: Response) => {
  const { tournamentType, tournamentName, tournamentDate } = req.body as {
    tournamentType?: string;
    tournamentName?: string;
    tournamentDate?: string;
  };

  if (!tournamentName || !tournamentDate) {
    return void res
      .status(400)
      .json({ error: "tournamentName and tournamentDate are required" });
  }

  const prefix = tournamentType === "sbl" ? "sbl" : "sbc";
  const existing = (
    db
      .prepare("SELECT id FROM tournaments WHERE id LIKE ?")
      .all(`${prefix}-%`) as { id: string }[]
  ).length;
  const id = `${prefix}-${existing + 1}`;

  db.prepare(
    "INSERT INTO tournaments (id, name, date, phases) VALUES (?, ?, ?, ?)",
  ).run(id, tournamentName, tournamentDate, "[]");

  const row = db
    .prepare("SELECT * FROM tournaments WHERE id = ?")
    .get(id) as TournamentRow;
  res.status(201).json(parseTournament(row));
});

app.put("/api/tournaments/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as { name?: string; date?: string; phases?: unknown[] };

  const existing = db
    .prepare("SELECT * FROM tournaments WHERE id = ?")
    .get(id) as TournamentRow | undefined;
  if (!existing)
    return void res.status(404).json({ error: "Tournament not found" });

  const name = body.name ?? existing.name;
  const date = body.date ?? existing.date;
  const phases =
    body.phases !== undefined ? JSON.stringify(body.phases) : existing.phases;

  db.prepare(
    "UPDATE tournaments SET name = ?, date = ?, phases = ? WHERE id = ?",
  ).run(name, date, phases, id);

  const updated = db
    .prepare("SELECT * FROM tournaments WHERE id = ?")
    .get(id) as TournamentRow;
  res.json(parseTournament(updated));
});

app.delete("/api/tournaments/:id", (req: Request, res: Response) => {
  const info = db
    .prepare("DELETE FROM tournaments WHERE id = ?")
    .run(req.params.id);
  if (info.changes === 0)
    return void res.status(404).json({ error: "Tournament not found" });
  res.status(204).send();
});

// ─── Teams ─────────────────────────────────────────────────────────────────
app.get("/api/teams", (_req: Request, res: Response) => {
  const rows = db.prepare("SELECT * FROM teams").all() as TeamRow[];
  res.json(rows.map(parseTeam));
});

app.get("/api/teams/:id", (req: Request, res: Response) => {
  const row = db
    .prepare("SELECT * FROM teams WHERE id = ?")
    .get(req.params.id) as TeamRow | undefined;
  if (!row) return void res.status(404).json({ error: "Team not found" });
  res.json(parseTeam(row));
});

app.post(
  "/api/teams",
  upload.single("teamPhoto"),
  (req: Request, res: Response) => {
    const {
      teamName,
      teamColor = "#f59e0b",
      login1 = "",
      login2 = "",
      login3 = "",
      tournament = "",
    } = req.body as Record<string, string>;

    if (!teamName || !tournament) {
      return void res
        .status(400)
        .json({ error: "teamName and tournament are required" });
    }

    const now = Date.now();
    const baseId = slugify(teamName) || "team";
    const teamId = `${baseId}-${now}`;
    const competitionType = detectCompetitionType(tournament);
    const competitionId = `${competitionType}-${slugify(tournament)}-${now}`;

    let logoPath = "/team-placeholder.png";
    if (req.file) {
      // rename to use the correct teamId
      const ext = path.extname(req.file.originalname) || ".png";
      const finalFilename = `${teamId}${ext}`;
      const finalPath = path.join(UPLOAD_DIR, finalFilename);
      fs.renameSync(req.file.path, finalPath);
      logoPath = `/teams/${finalFilename}`;
    }

    const players = [login1, login2, login3].filter(Boolean);
    const competitions = [
      {
        id: competitionId,
        name: tournament,
        type: competitionType,
        matches: [],
        mapStats: [],
      },
    ];

    db.prepare(
      "INSERT INTO teams (id, name, color, logo, players, competitions) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      teamId,
      teamName,
      teamColor,
      logoPath,
      JSON.stringify(players),
      JSON.stringify(competitions),
    );

    const row = db
      .prepare("SELECT * FROM teams WHERE id = ?")
      .get(teamId) as TeamRow;
    res.status(201).json(parseTeam(row));
  },
);

app.put("/api/teams/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as {
    name?: string;
    color?: string;
    logo?: string;
    players?: string[];
    competitions?: unknown[];
  };

  const existing = db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as
    | TeamRow
    | undefined;
  if (!existing) return void res.status(404).json({ error: "Team not found" });

  const name = body.name ?? existing.name;
  const color = body.color ?? existing.color;
  const logo = body.logo ?? existing.logo;
  const players =
    body.players !== undefined
      ? JSON.stringify(body.players)
      : existing.players;
  const competitions =
    body.competitions !== undefined
      ? JSON.stringify(body.competitions)
      : existing.competitions;

  db.prepare(
    "UPDATE teams SET name = ?, color = ?, logo = ?, players = ?, competitions = ? WHERE id = ?",
  ).run(name, color, logo, players, competitions, id);

  const updated = db
    .prepare("SELECT * FROM teams WHERE id = ?")
    .get(id) as TeamRow;
  res.json(parseTeam(updated));
});

app.post("/api/teams/:id/competitions", (req: Request, res: Response) => {
  const { id } = req.params;
  const { competitionName, competitionType: rawType } = req.body as {
    competitionName?: string;
    competitionType?: string;
  };

  if (!competitionName) {
    return void res.status(400).json({ error: "competitionName is required" });
  }

  const row = db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as
    | TeamRow
    | undefined;
  if (!row) return void res.status(404).json({ error: "Team not found" });

  const team = parseTeam(row);
  const duplicate = (team.competitions as { name: string }[]).some(
    (c) => c.name.trim().toLowerCase() === competitionName.trim().toLowerCase(),
  );
  if (duplicate) return void res.json(team);

  const type =
    rawType === "sbl" || rawType === "sbc" || rawType === "teamcup"
      ? rawType
      : detectCompetitionType(competitionName);

  const now = Date.now();
  const competitionId = `${type}-${slugify(competitionName)}-${now}`;

  (team.competitions as unknown[]).push({
    id: competitionId,
    name: competitionName,
    type,
    matches: [],
    mapStats: [],
  });

  db.prepare("UPDATE teams SET competitions = ? WHERE id = ?").run(
    JSON.stringify(team.competitions),
    id,
  );

  const updated = db
    .prepare("SELECT * FROM teams WHERE id = ?")
    .get(id) as TeamRow;
  res.json(parseTeam(updated));
});

app.delete("/api/teams/:id", (req: Request, res: Response) => {
  const info = db.prepare("DELETE FROM teams WHERE id = ?").run(req.params.id);
  if (info.changes === 0)
    return void res.status(404).json({ error: "Team not found" });
  res.status(204).send();
});

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Speedball API running on http://localhost:${PORT}`);
});
