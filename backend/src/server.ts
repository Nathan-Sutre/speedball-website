import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  db,
  parseTournament,
  parseTeam,
  parsePhase,
  parseMatch,
  parsePlayer,
  parsePlayerStat,
  TournamentRow,
  TeamRow,
  PhaseRow,
  MatchRow,
  PlayerRow,
  PlayerStatRow,
} from "./db";

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

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function extractTeamName(
  match: Record<string, unknown>,
  side: "home" | "away",
) {
  const sideKey = side === "home" ? "A" : "B";
  const nested = match[side === "home" ? "homeTeam" : "awayTeam"] as
    | Record<string, unknown>
    | undefined;
  const altNested = match[`team${sideKey}`] as
    | Record<string, unknown>
    | undefined;

  return (
    toText(nested?.name) ||
    toText(altNested?.name) ||
    toText(match[side === "home" ? "home" : "away"]) ||
    toText(match[side === "home" ? "homeTeamName" : "awayTeamName"])
  );
}

function extractScore(match: Record<string, unknown>, side: "home" | "away") {
  const sideKey = side === "home" ? "A" : "B";
  const nested = match[side === "home" ? "homeTeam" : "awayTeam"] as
    | Record<string, unknown>
    | undefined;
  const altNested = match[`team${sideKey}`] as
    | Record<string, unknown>
    | undefined;

  return (
    toNullableInt(match[side === "home" ? "homeScore" : "awayScore"]) ??
    toNullableInt(match[side === "home" ? "scoreA" : "scoreB"]) ??
    toNullableInt(nested?.score) ??
    toNullableInt(altNested?.score)
  );
}

function syncTournamentRelations(
  tournamentId: string,
  phasesInput: unknown[],
): void {
  const insertPhase = db.prepare(
    "INSERT INTO phases (id, tournament_id, name, phase_order) VALUES (?, ?, ?, ?)",
  );
  const insertMatch = db.prepare(
    "INSERT INTO matches (id, phase_id, match_order, home_team_name, away_team_name, home_score, away_score, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM phases WHERE tournament_id = ?").run(tournamentId);

    for (let phaseIndex = 0; phaseIndex < phasesInput.length; phaseIndex += 1) {
      const phase = phasesInput[phaseIndex] as Record<string, unknown>;
      const phaseName =
        toText(phase?.name) ||
        toText(phase?.title) ||
        `Phase ${phaseIndex + 1}`;
      const rawPhaseId = toText(phase?.id);
      const phaseId = rawPhaseId || `${tournamentId}-phase-${phaseIndex + 1}`;

      insertPhase.run(phaseId, tournamentId, phaseName, phaseIndex);

      const matches = Array.isArray(phase?.matches) ? phase.matches : [];
      for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
        const match = (matches[matchIndex] ?? {}) as Record<string, unknown>;
        const rawMatchId = toText(match?.id);
        const matchId = rawMatchId || `${phaseId}-match-${matchIndex + 1}`;

        insertMatch.run(
          matchId,
          phaseId,
          matchIndex,
          extractTeamName(match, "home"),
          extractTeamName(match, "away"),
          extractScore(match, "home"),
          extractScore(match, "away"),
          JSON.stringify(match),
        );
      }
    }
  });

  transaction();
}

function syncTeamPlayers(teamId: string, playersInput: string[]): void {
  const normalizedPlayers = playersInput
    .map((login) => login.trim())
    .filter((login) => login.length > 0);

  const upsertPlayer = db.prepare(`
    INSERT INTO players (id, team_id, login, nickname)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(login) DO UPDATE SET
      team_id = excluded.team_id,
      nickname = excluded.nickname
  `);

  const transaction = db.transaction(() => {
    if (normalizedPlayers.length === 0) {
      db.prepare("UPDATE players SET team_id = NULL WHERE team_id = ?").run(
        teamId,
      );
      return;
    }

    const placeholders = normalizedPlayers.map(() => "?").join(", ");
    db.prepare(
      `UPDATE players SET team_id = NULL WHERE team_id = ? AND login NOT IN (${placeholders})`,
    ).run(teamId, ...normalizedPlayers);

    for (const login of normalizedPlayers) {
      const generatedId = `player-${slugify(login)}-${Date.now()}`;
      upsertPlayer.run(generatedId, teamId, login, login);
    }
  });

  transaction();
}

function backfillRelationalTablesFromJsonColumns(): void {
  const tournamentRows = db
    .prepare("SELECT * FROM tournaments")
    .all() as TournamentRow[];
  for (const tournamentRow of tournamentRows) {
    const tournament = parseTournament(tournamentRow) as {
      id: string;
      phases?: unknown[];
    };
    const phases = Array.isArray(tournament.phases) ? tournament.phases : [];
    syncTournamentRelations(tournament.id, phases);
  }

  const teamRows = db.prepare("SELECT * FROM teams").all() as TeamRow[];
  for (const teamRow of teamRows) {
    const team = parseTeam(teamRow);
    syncTeamPlayers(team.id, team.players);
  }
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

  syncTournamentRelations(id, []);

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

  if (body.phases !== undefined) {
    syncTournamentRelations(id, body.phases);
  }

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

app.get("/api/tournaments/:id/phases", (req: Request, res: Response) => {
  const tournament = db
    .prepare("SELECT id FROM tournaments WHERE id = ?")
    .get(req.params.id) as { id: string } | undefined;
  if (!tournament) {
    return void res.status(404).json({ error: "Tournament not found" });
  }

  const phases = db
    .prepare(
      "SELECT * FROM phases WHERE tournament_id = ? ORDER BY phase_order",
    )
    .all(req.params.id) as PhaseRow[];

  const phaseIds = phases.map((phase) => phase.id);
  const matchesByPhase = new Map<string, ReturnType<typeof parseMatch>[]>();

  if (phaseIds.length > 0) {
    const placeholders = phaseIds.map(() => "?").join(", ");
    const matchRows = db
      .prepare(
        `SELECT * FROM matches WHERE phase_id IN (${placeholders}) ORDER BY match_order`,
      )
      .all(...phaseIds) as MatchRow[];
    for (const row of matchRows) {
      const parsed = parseMatch(row);
      const list = matchesByPhase.get(parsed.phaseId) ?? [];
      list.push(parsed);
      matchesByPhase.set(parsed.phaseId, list);
    }
  }

  res.json(
    phases.map((phase) => ({
      ...parsePhase(phase),
      matches: matchesByPhase.get(phase.id) ?? [],
    })),
  );
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

    syncTeamPlayers(teamId, players);

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

  if (body.players !== undefined) {
    syncTeamPlayers(id, body.players);
  }

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

// ─── Players + Stats ──────────────────────────────────────────────────────
app.get("/api/players", (_req: Request, res: Response) => {
  const rows = db
    .prepare("SELECT * FROM players ORDER BY created_at DESC")
    .all() as PlayerRow[];
  res.json(rows.map(parsePlayer));
});

app.get("/api/player-stats", (req: Request, res: Response) => {
  const { playerId, playerLogin, tournamentId, phaseId, matchId } =
    req.query as {
      playerId?: string;
      playerLogin?: string;
      tournamentId?: string;
      phaseId?: string;
      matchId?: string;
    };

  let resolvedPlayerId = playerId;
  if (!resolvedPlayerId && playerLogin) {
    const player = db
      .prepare("SELECT id FROM players WHERE login = ?")
      .get(playerLogin) as { id: string } | undefined;
    resolvedPlayerId = player?.id;
  }

  const conditions: string[] = [];
  const params: Array<string> = [];

  if (resolvedPlayerId) {
    conditions.push("player_id = ?");
    params.push(resolvedPlayerId);
  }
  if (tournamentId) {
    conditions.push("tournament_id = ?");
    params.push(tournamentId);
  }
  if (phaseId) {
    conditions.push("phase_id = ?");
    params.push(phaseId);
  }
  if (matchId) {
    conditions.push("match_id = ?");
    params.push(matchId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT * FROM player_stats ${whereClause} ORDER BY recorded_at DESC`,
    )
    .all(...params) as PlayerStatRow[];

  res.json(rows.map(parsePlayerStat));
});

app.post("/api/player-stats", (req: Request, res: Response) => {
  const { playerId, playerLogin, tournamentId, phaseId, matchId, stats } =
    req.body as {
      playerId?: string;
      playerLogin?: string;
      tournamentId?: string;
      phaseId?: string;
      matchId?: string;
      stats?: Record<string, unknown>;
    };

  let resolvedPlayerId = playerId;

  if (!resolvedPlayerId && playerLogin) {
    const existingPlayer = db
      .prepare("SELECT * FROM players WHERE login = ?")
      .get(playerLogin) as PlayerRow | undefined;

    if (existingPlayer) {
      resolvedPlayerId = existingPlayer.id;
    } else {
      const generatedId = `player-${slugify(playerLogin)}-${Date.now()}`;
      db.prepare(
        "INSERT INTO players (id, team_id, login, nickname) VALUES (?, NULL, ?, ?)",
      ).run(generatedId, playerLogin, playerLogin);
      resolvedPlayerId = generatedId;
    }
  }

  if (!resolvedPlayerId) {
    return void res.status(400).json({
      error: "playerId or playerLogin is required",
    });
  }

  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return void res.status(400).json({
      error: "stats object is required",
    });
  }

  const entries = Object.entries(stats)
    .map(([key, value]) => ({ key: key.trim(), value: Number(value) }))
    .filter((item) => item.key.length > 0 && Number.isFinite(item.value));

  if (entries.length === 0) {
    return void res.status(400).json({
      error: "stats must contain at least one numeric key/value pair",
    });
  }

  const insertStat = db.prepare(
    "INSERT INTO player_stats (id, player_id, tournament_id, phase_id, match_id, stat_key, stat_value) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const transaction = db.transaction(() => {
    for (const entry of entries) {
      const statId = `ps-${resolvedPlayerId}-${entry.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insertStat.run(
        statId,
        resolvedPlayerId,
        tournamentId ?? null,
        phaseId ?? null,
        matchId ?? null,
        entry.key,
        entry.value,
      );
    }
  });

  transaction();

  const saved = db
    .prepare(
      "SELECT * FROM player_stats WHERE player_id = ? ORDER BY recorded_at DESC LIMIT ?",
    )
    .all(resolvedPlayerId, entries.length) as PlayerStatRow[];

  res.status(201).json(saved.map(parsePlayerStat));
});

// ─── Start ─────────────────────────────────────────────────────────────────
backfillRelationalTablesFromJsonColumns();

app.listen(PORT, () => {
  console.log(`🚀 Speedball API running on http://localhost:${PORT}`);
});
