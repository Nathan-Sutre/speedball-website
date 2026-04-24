import express, { Request, Response } from "express";
import cors from "cors";
import {
  db,
  MapRow,
  MatchRow,
  PlayerRow,
  TeamRow,
  TournamentRow,
  parseMatch,
} from "./db";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

function toId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

type TournamentType = "sbl" | "sbc" | "funcup" | "teamcup";
type TournamentFilterType = TournamentType | "public" | "all";

const TOURNAMENT_TYPES: TournamentType[] = ["sbl", "sbc", "funcup", "teamcup"];

function isTournamentType(value: string): value is TournamentType {
  return TOURNAMENT_TYPES.includes(value as TournamentType);
}

function parseTournamentFilter(value: unknown): {
  value: TournamentFilterType;
  valid: boolean;
} {
  if (typeof value !== "string" || value.trim() === "") {
    return { value: "all", valid: true };
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "public" || normalized === "all") {
    return { value: normalized, valid: true };
  }

  if (isTournamentType(normalized)) {
    return { value: normalized, valid: true };
  }

  return { value: "all", valid: false };
}

function parseEdition(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

type RawPlayerMatchStat = {
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

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeRawPlayerStat(value: unknown): RawPlayerMatchStat | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const login = String(candidate.login ?? "").trim();
  if (!login) return null;

  const kills = toNumber(candidate.kills);
  const deaths = toNumber(candidate.deaths);

  return {
    login,
    nickname: String(candidate.nickname ?? "").trim() || undefined,
    team: String(candidate.team ?? "").trim() || undefined,
    points: toNumber(candidate.points),
    damage: toNumber(candidate.damage),
    ballHits: toNumber(candidate.ballHits),
    kills,
    deaths,
    kdRatio:
      candidate.kdRatio !== undefined
        ? toNumber(candidate.kdRatio)
        : deaths > 0
          ? kills / deaths
          : kills,
    accuracy: toNumber(candidate.accuracy),
    shots: toNumber(candidate.shots),
    passes: toNumber(candidate.passes),
    catches: toNumber(candidate.catches),
    backstabs: toNumber(candidate.backstabs),
    backspaced: toNumber(candidate.backspaced),
    ballGivenAway: toNumber(candidate.ballGivenAway),
    ballStolen: toNumber(candidate.ballStolen),
    ballPossession: toNumber(candidate.ballPossession),
    nearMisses: toNumber(candidate.nearMisses),
    captureTries: toNumber(candidate.captureTries),
    caps: toNumber(candidate.caps),
    capPercent: toNumber(candidate.capPercent),
    capSec: toNumber(candidate.capSec),
  };
}

function buildMatchFilterClause(
  type: TournamentFilterType,
  edition: number | null,
): {
  whereClause: string;
  params: Array<number | string>;
} {
  if (type === "public") {
    return {
      whereClause: "WHERE m.tournament_id IS NULL",
      params: [],
    };
  }

  if (type === "all") {
    return {
      whereClause: "",
      params: [],
    };
  }

  if (edition) {
    return {
      whereClause:
        "WHERE m.tournament_id IS NOT NULL AND t.type = ? AND t.edition = ?",
      params: [type, edition],
    };
  }

  return {
    whereClause: "WHERE m.tournament_id IS NOT NULL AND t.type = ?",
    params: [type],
  };
}

// Tournaments
app.get("/api/tournaments/GetAll", (req: Request, res: Response) => {
  const { value: typeFilter, valid } = parseTournamentFilter(req.query.type);
  if (!valid || typeFilter === "public") {
    return void res.status(400).json({
      error: "Invalid type. Allowed values: sbl, sbc, funcup, teamcup, all",
    });
  }

  const editionFilter = parseEdition(req.query.edition);
  if (req.query.edition !== undefined && editionFilter === null) {
    return void res.status(400).json({ error: "Invalid edition" });
  }

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (typeFilter !== "all") {
    where.push("type = ?");
    params.push(typeFilter);
  }

  if (editionFilter !== null) {
    where.push("edition = ?");
    params.push(editionFilter);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT id, name, date, type, edition
       FROM tournaments
       ${whereClause}
       ORDER BY date DESC, id DESC`,
    )
    .all(...params) as TournamentRow[];
  res.json(rows);
});

app.get("/api/tournaments/GetOne/:id", (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return void res.status(400).json({ error: "Invalid tournament id" });

  const row = db
    .prepare(
      "SELECT id, name, date, type, edition FROM tournaments WHERE id = ?",
    )
    .get(id) as TournamentRow | undefined;

  if (!row) return void res.status(404).json({ error: "Tournament not found" });
  res.json(row);
});

app.post("/api/tournaments/CreateOne", (req: Request, res: Response) => {
  const { name, date, type, edition } = req.body as {
    name?: string;
    date?: string;
    type?: string;
    edition?: number;
  };

  if (!name || !date || !type) {
    return void res
      .status(400)
      .json({ error: "name, date and type are required" });
  }

  const normalizedType = type.trim().toLowerCase();
  if (!isTournamentType(normalizedType)) {
    return void res.status(400).json({
      error: "Invalid type. Allowed values: sbl, sbc, funcup, teamcup",
    });
  }

  if (!Number.isInteger(edition) || (edition ?? 0) <= 0) {
    return void res
      .status(400)
      .json({ error: "edition must be a positive integer" });
  }

  const result = db
    .prepare(
      "INSERT INTO tournaments (name, date, type, edition) VALUES (?, ?, ?, ?)",
    )
    .run(name, date, normalizedType, edition);

  const row = db
    .prepare(
      "SELECT id, name, date, type, edition FROM tournaments WHERE id = ?",
    )
    .get(result.lastInsertRowid) as TournamentRow;

  res.status(201).json(row);
});

app.put("/api/tournaments/:id", (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return void res.status(400).json({ error: "Invalid tournament id" });

  const { name, date, type, edition } = req.body as {
    name?: string;
    date?: string;
    type?: string;
    edition?: number;
  };

  const current = db
    .prepare(
      "SELECT id, name, date, type, edition FROM tournaments WHERE id = ?",
    )
    .get(id) as TournamentRow | undefined;
  if (!current)
    return void res.status(404).json({ error: "Tournament not found" });

  const nextName =
    typeof name === "string" && name.trim() ? name.trim() : current.name;
  const nextDate =
    typeof date === "string" && date.trim() ? date.trim() : current.date;
  const nextTypeRaw =
    typeof type === "string" ? type.trim().toLowerCase() : current.type;
  const nextEdition =
    Number.isInteger(edition) && (edition ?? 0) > 0 ? edition : current.edition;

  if (!isTournamentType(nextTypeRaw)) {
    return void res.status(400).json({
      error: "Invalid type. Allowed values: sbl, sbc, funcup, teamcup",
    });
  }

  db.prepare(
    `UPDATE tournaments
     SET name = ?, date = ?, type = ?, edition = ?
     WHERE id = ?`,
  ).run(nextName, nextDate, nextTypeRaw, nextEdition, id);

  const updated = db
    .prepare(
      "SELECT id, name, date, type, edition FROM tournaments WHERE id = ?",
    )
    .get(id) as TournamentRow;

  res.json(updated);
});

app.delete("/api/tournaments/:id", (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return void res.status(400).json({ error: "Invalid tournament id" });

  const result = db.prepare("DELETE FROM tournaments WHERE id = ?").run(id);

  if (result.changes === 0) {
    return void res.status(404).json({ error: "Tournament not found" });
  }

  res.status(204).send();
});

app.get("/api/tournaments/editions", (req: Request, res: Response) => {
  const { value: typeFilter, valid } = parseTournamentFilter(req.query.type);
  if (!valid || typeFilter === "all" || typeFilter === "public") {
    return void res
      .status(400)
      .json({ error: "type query is required: sbl, sbc, funcup, teamcup" });
  }

  const rows = db
    .prepare(
      `SELECT DISTINCT edition
       FROM tournaments
       WHERE type = ?
       ORDER BY edition DESC`,
    )
    .all(typeFilter) as Array<{ edition: number }>;

  res.json(rows.map((r) => r.edition));
});

// Matches
app.get("/api/matches/:tournamentId/GetAll", (req: Request, res: Response) => {
  const tournamentId = toId(req.params.tournamentId);
  if (!tournamentId) {
    return void res.status(400).json({ error: "Invalid tournament id" });
  }

  const rows = db
    .prepare(
      `SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id,
              m.map_id, m.duration_seconds, m.blue_players, m.red_players,
              m.home_score, m.away_score, m.played_at,
              mp.name AS map_name,
              ht.name AS home_team_name,
              at.name AS away_team_name
       FROM matches m
       LEFT JOIN maps mp ON mp.id = m.map_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       WHERE m.tournament_id = ?
       ORDER BY m.played_at DESC, m.id DESC`,
    )
    .all(tournamentId) as Array<
    MatchRow & {
      map_name: string | null;
      home_team_name: string | null;
      away_team_name: string | null;
    }
  >;

  res.json(
    rows.map((row) => ({
      ...parseMatch(row),
      map_name: row.map_name,
      home_team_name: row.home_team_name,
      away_team_name: row.away_team_name,
    })),
  );
});

app.post(
  "/api/matches/:tournamentId/CreateOne",
  (req: Request, res: Response) => {
    const tournamentId = toId(req.params.tournamentId);
    if (!tournamentId) {
      return void res.status(400).json({ error: "Invalid tournament id" });
    }

    const tournamentExists = db
      .prepare("SELECT id FROM tournaments WHERE id = ?")
      .get(tournamentId) as { id: number } | undefined;
    if (!tournamentExists) {
      return void res.status(404).json({ error: "Tournament not found" });
    }

    const {
      home_team_id,
      away_team_id,
      map_id,
      duration_seconds,
      blue_players,
      red_players,
      player_stats,
      home_score,
      away_score,
      played_at,
    } = req.body as {
      home_team_id?: number | null;
      away_team_id?: number | null;
      map_id?: number | null;
      duration_seconds?: number;
      blue_players?: string[];
      red_players?: string[];
      player_stats?: RawPlayerMatchStat[];
      home_score?: number;
      away_score?: number;
      played_at?: string;
    };

    if (
      home_team_id !== undefined &&
      home_team_id !== null &&
      (!Number.isInteger(home_team_id) || home_team_id <= 0)
    ) {
      return void res.status(400).json({ error: "Invalid home_team_id" });
    }

    if (
      away_team_id !== undefined &&
      away_team_id !== null &&
      (!Number.isInteger(away_team_id) || away_team_id <= 0)
    ) {
      return void res.status(400).json({ error: "Invalid away_team_id" });
    }

    if (home_team_id && away_team_id && home_team_id === away_team_id) {
      return void res
        .status(400)
        .json({ error: "home_team_id and away_team_id must be different" });
    }

    if (
      map_id !== undefined &&
      map_id !== null &&
      (!Number.isInteger(map_id) || map_id <= 0)
    ) {
      return void res.status(400).json({ error: "Invalid map_id" });
    }

    if (
      duration_seconds !== undefined &&
      (!Number.isFinite(duration_seconds) || duration_seconds < 0)
    ) {
      return void res
        .status(400)
        .json({ error: "duration_seconds must be >= 0" });
    }

    const hScore = Number.isFinite(home_score) ? Number(home_score) : 0;
    const aScore = Number.isFinite(away_score) ? Number(away_score) : 0;

    if (hScore < 0 || aScore < 0) {
      return void res
        .status(400)
        .json({ error: "home_score and away_score must be >= 0" });
    }

    const result = db
      .prepare(
        `INSERT INTO matches (
          tournament_id,
          home_team_id,
          away_team_id,
          map_id,
          duration_seconds,
          blue_players,
          red_players,
          player_stats_json,
          home_score,
          away_score,
          played_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      )
      .run(
        tournamentId,
        home_team_id ?? null,
        away_team_id ?? null,
        map_id ?? null,
        duration_seconds ?? 0,
        JSON.stringify(Array.isArray(blue_players) ? blue_players : []),
        JSON.stringify(Array.isArray(red_players) ? red_players : []),
        JSON.stringify(Array.isArray(player_stats) ? player_stats : []),
        hScore,
        aScore,
        played_at ?? null,
      );

    const row = db
      .prepare(
        `SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id,
                m.map_id, m.duration_seconds, m.blue_players, m.red_players,
                m.home_score, m.away_score, m.played_at,
                mp.name AS map_name,
                ht.name AS home_team_name,
                at.name AS away_team_name
         FROM matches m
         LEFT JOIN maps mp ON mp.id = m.map_id
         LEFT JOIN teams ht ON ht.id = m.home_team_id
         LEFT JOIN teams at ON at.id = m.away_team_id
         WHERE m.id = ?`,
      )
      .get(result.lastInsertRowid) as
      | (MatchRow & {
          map_name: string | null;
          home_team_name: string | null;
          away_team_name: string | null;
        })
      | undefined;

    res.status(201).json(
      row
        ? {
            ...parseMatch(row),
            map_name: row.map_name,
            home_team_name: row.home_team_name,
            away_team_name: row.away_team_name,
          }
        : null,
    );
  },
);

app.post("/api/matches/CreateOne", (req: Request, res: Response) => {
  const {
    tournament_id,
    home_team_id,
    away_team_id,
    map_id,
    duration_seconds,
    blue_players,
    red_players,
    player_stats,
    home_score,
    away_score,
    played_at,
  } = req.body as {
    tournament_id?: number | null;
    home_team_id?: number | null;
    away_team_id?: number | null;
    map_id?: number | null;
    duration_seconds?: number;
    blue_players?: string[];
    red_players?: string[];
    player_stats?: RawPlayerMatchStat[];
    home_score?: number;
    away_score?: number;
    played_at?: string;
  };

  if (
    tournament_id !== undefined &&
    tournament_id !== null &&
    (!Number.isInteger(tournament_id) || tournament_id <= 0)
  ) {
    return void res.status(400).json({ error: "Invalid tournament_id" });
  }

  if (
    home_team_id !== undefined &&
    home_team_id !== null &&
    (!Number.isInteger(home_team_id) || home_team_id <= 0)
  ) {
    return void res.status(400).json({ error: "Invalid home_team_id" });
  }

  if (
    away_team_id !== undefined &&
    away_team_id !== null &&
    (!Number.isInteger(away_team_id) || away_team_id <= 0)
  ) {
    return void res.status(400).json({ error: "Invalid away_team_id" });
  }

  if (home_team_id && away_team_id && home_team_id === away_team_id) {
    return void res
      .status(400)
      .json({ error: "home_team_id and away_team_id must be different" });
  }

  if (
    map_id !== undefined &&
    map_id !== null &&
    (!Number.isInteger(map_id) || map_id <= 0)
  ) {
    return void res.status(400).json({ error: "Invalid map_id" });
  }

  if (
    duration_seconds !== undefined &&
    (!Number.isFinite(duration_seconds) || duration_seconds < 0)
  ) {
    return void res
      .status(400)
      .json({ error: "duration_seconds must be >= 0" });
  }

  if (tournament_id) {
    const tournamentExists = db
      .prepare("SELECT id FROM tournaments WHERE id = ?")
      .get(tournament_id) as { id: number } | undefined;
    if (!tournamentExists) {
      return void res.status(404).json({ error: "Tournament not found" });
    }
  }

  const hScore = Number.isFinite(home_score) ? Number(home_score) : 0;
  const aScore = Number.isFinite(away_score) ? Number(away_score) : 0;

  if (hScore < 0 || aScore < 0) {
    return void res
      .status(400)
      .json({ error: "home_score and away_score must be >= 0" });
  }

  const result = db
    .prepare(
      `INSERT INTO matches (
        tournament_id,
        home_team_id,
        away_team_id,
        map_id,
        duration_seconds,
        blue_players,
        red_players,
        player_stats_json,
        home_score,
        away_score,
        played_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
    )
    .run(
      tournament_id ?? null,
      home_team_id ?? null,
      away_team_id ?? null,
      map_id ?? null,
      duration_seconds ?? 0,
      JSON.stringify(Array.isArray(blue_players) ? blue_players : []),
      JSON.stringify(Array.isArray(red_players) ? red_players : []),
      JSON.stringify(Array.isArray(player_stats) ? player_stats : []),
      hScore,
      aScore,
      played_at ?? null,
    );

  const row = db
    .prepare(
      `SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id,
              m.map_id, m.duration_seconds, m.blue_players, m.red_players,
              m.home_score, m.away_score, m.played_at,
              mp.name AS map_name,
              ht.name AS home_team_name,
              at.name AS away_team_name
       FROM matches m
       LEFT JOIN maps mp ON mp.id = m.map_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       WHERE m.id = ?`,
    )
    .get(result.lastInsertRowid) as
    | (MatchRow & {
        map_name: string | null;
        home_team_name: string | null;
        away_team_name: string | null;
      })
    | undefined;

  res.status(201).json(
    row
      ? {
          ...parseMatch(row),
          map_name: row.map_name,
          home_team_name: row.home_team_name,
          away_team_name: row.away_team_name,
        }
      : null,
  );
});

app.get(
  "/api/matches/:tournamentId/GetOne/:id",
  (req: Request, res: Response) => {
    const tournamentId = toId(req.params.tournamentId);
    const id = toId(req.params.id);
    if (!tournamentId || !id) {
      return void res
        .status(400)
        .json({ error: "Invalid tournament id or match id" });
    }

    const row = db
      .prepare(
        `SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id,
                m.map_id, m.duration_seconds, m.blue_players, m.red_players,
                m.home_score, m.away_score, m.played_at,
                mp.name AS map_name,
                ht.name AS home_team_name,
                at.name AS away_team_name
         FROM matches m
         LEFT JOIN maps mp ON mp.id = m.map_id
         LEFT JOIN teams ht ON ht.id = m.home_team_id
         LEFT JOIN teams at ON at.id = m.away_team_id
         WHERE m.tournament_id = ? AND m.id = ?`,
      )
      .get(tournamentId, id) as
      | (MatchRow & {
          map_name: string | null;
          home_team_name: string | null;
          away_team_name: string | null;
        })
      | undefined;

    if (!row) return void res.status(404).json({ error: "Match not found" });
    res.json({
      ...parseMatch(row),
      map_name: row.map_name,
      home_team_name: row.home_team_name,
      away_team_name: row.away_team_name,
    });
  },
);

// LastGames (derived from matches)
app.get("/api/last-games/GetAll", (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id,
              m.map_id, m.duration_seconds, m.blue_players, m.red_players,
              m.home_score, m.away_score, m.played_at,
              mp.name AS map_name,
              ht.name AS home_team_name,
              at.name AS away_team_name
       FROM matches m
       LEFT JOIN maps mp ON mp.id = m.map_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       ORDER BY m.played_at DESC, m.id DESC
       LIMIT 5`,
    )
    .all() as Array<
    MatchRow & {
      map_name: string | null;
      home_team_name: string | null;
      away_team_name: string | null;
    }
  >;

  res.json(
    rows.map((row) => ({
      ...parseMatch(row),
      map_name: row.map_name,
      home_team_name: row.home_team_name,
      away_team_name: row.away_team_name,
    })),
  );
});

app.get("/api/last-games/GetOne/:id", (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return void res.status(400).json({ error: "Invalid last-game id" });

  const row = db
    .prepare(
      `SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id,
              m.map_id, m.duration_seconds, m.blue_players, m.red_players,
              m.home_score, m.away_score, m.played_at,
              mp.name AS map_name,
              ht.name AS home_team_name,
              at.name AS away_team_name
       FROM matches m
       LEFT JOIN maps mp ON mp.id = m.map_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       WHERE m.id = ?`,
    )
    .get(id) as
    | (MatchRow & {
        map_name: string | null;
        home_team_name: string | null;
        away_team_name: string | null;
      })
    | undefined;

  if (!row) return void res.status(404).json({ error: "Last game not found" });

  res.json({
    ...parseMatch(row),
    map_name: row.map_name,
    home_team_name: row.home_team_name,
    away_team_name: row.away_team_name,
  });
});

// Players
app.get("/api/players/GetAll", (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.team_id, p.login, p.nickname, p.created_at, t.name AS team_name
       FROM players p
       LEFT JOIN teams t ON t.id = p.team_id
       ORDER BY p.id DESC`,
    )
    .all() as Array<PlayerRow & { team_name: string | null }>;
  res.json(rows);
});

app.get("/api/players/GetOne/:id", (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return void res.status(400).json({ error: "Invalid player id" });

  const row = db
    .prepare(
      `SELECT p.id, p.team_id, p.login, p.nickname, p.created_at, t.name AS team_name
       FROM players p
       LEFT JOIN teams t ON t.id = p.team_id
       WHERE p.id = ?`,
    )
    .get(id) as (PlayerRow & { team_name: string | null }) | undefined;

  if (!row) return void res.status(404).json({ error: "Player not found" });
  res.json(row);
});

// Teams
app.get("/api/teams/GetAll", (_req: Request, res: Response) => {
  const rows = db
    .prepare("SELECT id, name, color, logo FROM teams ORDER BY id DESC")
    .all() as TeamRow[];
  res.json(rows);
});

app.get("/api/teams/GetOne/:id", (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return void res.status(400).json({ error: "Invalid team id" });

  const row = db
    .prepare("SELECT id, name, color, logo FROM teams WHERE id = ?")
    .get(id) as TeamRow | undefined;

  if (!row) return void res.status(404).json({ error: "Team not found" });
  res.json(row);
});

app.post("/api/teams/CreateOne", (req: Request, res: Response) => {
  const { name, color, logo } = req.body as {
    name?: string;
    color?: string;
    logo?: string;
  };

  if (!name || !name.trim()) {
    return void res.status(400).json({ error: "name is required" });
  }

  const result = db
    .prepare(
      "INSERT INTO teams (name, color, logo) VALUES (?, COALESCE(?, '#f59e0b'), COALESCE(?, '/team-placeholder.png'))",
    )
    .run(name.trim(), color ?? null, logo ?? null);

  const row = db
    .prepare("SELECT id, name, color, logo FROM teams WHERE id = ?")
    .get(result.lastInsertRowid) as TeamRow;

  res.status(201).json(row);
});

app.get("/api/teams/:id/competitions", (req: Request, res: Response) => {
  const teamId = toId(req.params.id);
  if (!teamId) return void res.status(400).json({ error: "Invalid team id" });

  const teamExists = db
    .prepare("SELECT id FROM teams WHERE id = ?")
    .get(teamId) as { id: number } | undefined;
  if (!teamExists)
    return void res.status(404).json({ error: "Team not found" });

  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.type, t.edition
       FROM team_competitions tc
       INNER JOIN tournaments t ON t.id = tc.tournament_id
       WHERE tc.team_id = ?
       ORDER BY t.date DESC, t.id DESC`,
    )
    .all(teamId) as Array<{
    id: number;
    name: string;
    type: TournamentType;
    edition: number;
  }>;

  res.json(rows);
});

app.post("/api/teams/:id/competitions", (req: Request, res: Response) => {
  const teamId = toId(req.params.id);
  if (!teamId) return void res.status(400).json({ error: "Invalid team id" });

  const teamExists = db
    .prepare("SELECT id FROM teams WHERE id = ?")
    .get(teamId) as { id: number } | undefined;
  if (!teamExists)
    return void res.status(404).json({ error: "Team not found" });

  const { tournamentId, competitionName } = req.body as {
    tournamentId?: number | string;
    competitionName?: string;
  };

  let resolvedTournamentId: number | null = null;
  if (typeof tournamentId === "number" && Number.isInteger(tournamentId)) {
    resolvedTournamentId = tournamentId > 0 ? tournamentId : null;
  } else if (typeof tournamentId === "string") {
    resolvedTournamentId = toId(tournamentId);
  }

  if (!resolvedTournamentId && typeof competitionName === "string") {
    const normalizedName = competitionName.trim();
    if (normalizedName) {
      const found = db
        .prepare(
          "SELECT id FROM tournaments WHERE name = ? ORDER BY id DESC LIMIT 1",
        )
        .get(normalizedName) as { id: number } | undefined;
      resolvedTournamentId = found?.id ?? null;
    }
  }

  if (!resolvedTournamentId) {
    return void res.status(400).json({
      error: "tournamentId (or competitionName) is required",
    });
  }

  const tournament = db
    .prepare("SELECT id, name, type, edition FROM tournaments WHERE id = ?")
    .get(resolvedTournamentId) as
    | {
        id: number;
        name: string;
        type: TournamentType;
        edition: number;
      }
    | undefined;

  if (!tournament) {
    return void res.status(404).json({ error: "Tournament not found" });
  }

  db.prepare(
    `INSERT OR IGNORE INTO team_competitions (team_id, tournament_id)
     VALUES (?, ?)`,
  ).run(teamId, tournament.id);

  res.status(201).json(tournament);
});

// Maps
app.get("/api/maps/GetAll", (_req: Request, res: Response) => {
  const rows = db
    .prepare("SELECT id, name, image FROM maps ORDER BY id DESC")
    .all() as MapRow[];
  res.json(rows);
});

app.get("/api/maps/GetOne/:id", (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return void res.status(400).json({ error: "Invalid map id" });

  const row = db
    .prepare("SELECT id, name, image FROM maps WHERE id = ?")
    .get(id) as MapRow | undefined;

  if (!row) return void res.status(404).json({ error: "Map not found" });
  res.json(row);
});

app.get("/api/player-stats/GetRaw", (req: Request, res: Response) => {
  const { value: typeFilter, valid } = parseTournamentFilter(req.query.type);
  if (!valid) {
    return void res.status(400).json({
      error:
        "Invalid type. Allowed values: all, public, sbl, sbc, funcup, teamcup",
    });
  }

  const tournamentId =
    typeof req.query.tournamentId === "string"
      ? toId(req.query.tournamentId)
      : null;

  if (req.query.tournamentId !== undefined && !tournamentId) {
    return void res.status(400).json({ error: "Invalid tournamentId" });
  }

  if (typeFilter === "public" && tournamentId) {
    return void res
      .status(400)
      .json({ error: "tournamentId is not allowed when type=public" });
  }

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (tournamentId) {
    where.push("m.tournament_id = ?");
    params.push(tournamentId);
  } else if (typeFilter === "public") {
    where.push("m.tournament_id IS NULL");
  } else if (typeFilter !== "all") {
    where.push("m.tournament_id IS NOT NULL");
    where.push("t.type = ?");
    params.push(typeFilter);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT
         m.id AS match_id,
         m.tournament_id,
         m.blue_players,
         m.red_players,
         m.player_stats_json,
         t.name AS tournament_name,
         t.type AS tournament_type,
         t.edition AS tournament_edition
       FROM matches m
       LEFT JOIN tournaments t ON t.id = m.tournament_id
       ${whereClause}
       ORDER BY m.played_at DESC, m.id DESC`,
    )
    .all(...params) as Array<{
    match_id: number;
    tournament_id: number | null;
    blue_players: string;
    red_players: string;
    player_stats_json?: string;
    tournament_name: string | null;
    tournament_type: TournamentType | null;
    tournament_edition: number | null;
  }>;

  const payload: Array<
    RawPlayerMatchStat & {
      match_id: number;
      tournament_id: number | null;
      tournament_name: string | null;
      tournament_type: TournamentType | "public" | null;
      tournament_edition: number | null;
    }
  > = [];

  for (const row of rows) {
    let parsedStats: RawPlayerMatchStat[] = [];
    try {
      const decoded = JSON.parse(row.player_stats_json ?? "[]") as unknown[];
      if (Array.isArray(decoded)) {
        parsedStats = decoded
          .map(normalizeRawPlayerStat)
          .filter((entry): entry is RawPlayerMatchStat => entry !== null);
      }
    } catch {
      parsedStats = [];
    }

    if (parsedStats.length === 0) {
      const bluePlayers = JSON.parse(row.blue_players || "[]") as string[];
      const redPlayers = JSON.parse(row.red_players || "[]") as string[];
      const fallback = [
        ...bluePlayers.map((login) => ({ login, team: "blue" })),
        ...redPlayers.map((login) => ({ login, team: "red" })),
      ];

      for (const item of fallback) {
        const normalized = normalizeRawPlayerStat(item);
        if (!normalized) continue;
        payload.push({
          ...normalized,
          match_id: row.match_id,
          tournament_id: row.tournament_id,
          tournament_name: row.tournament_name,
          tournament_type: row.tournament_type ?? "public",
          tournament_edition: row.tournament_edition,
        });
      }
      continue;
    }

    for (const stat of parsedStats) {
      payload.push({
        ...stat,
        match_id: row.match_id,
        tournament_id: row.tournament_id,
        tournament_name: row.tournament_name,
        tournament_type: row.tournament_type ?? "public",
        tournament_edition: row.tournament_edition,
      });
    }
  }

  res.json(payload);
});

app.get("/api/player-stats/GetAll", (req: Request, res: Response) => {
  const { value: typeFilter, valid } = parseTournamentFilter(req.query.type);
  if (!valid) {
    return void res.status(400).json({
      error:
        "Invalid type. Allowed values: all, public, sbl, sbc, funcup, teamcup",
    });
  }

  const editionFilter = parseEdition(req.query.edition);
  if (req.query.edition !== undefined && editionFilter === null) {
    return void res.status(400).json({ error: "Invalid edition" });
  }

  if (typeFilter === "public" && editionFilter !== null) {
    return void res
      .status(400)
      .json({ error: "edition is not allowed when type=public" });
  }

  const { whereClause, params } = buildMatchFilterClause(
    typeFilter,
    editionFilter,
  );

  const rows = db
    .prepare(
      `WITH filtered_matches AS (
         SELECT m.id, m.blue_players, m.red_players, m.home_score, m.away_score
         FROM matches m
         LEFT JOIN tournaments t ON t.id = m.tournament_id
         ${whereClause}
       ), all_players AS (
         SELECT
           CAST(blue.value AS TEXT) AS login,
           1 AS is_blue,
           fm.home_score,
           fm.away_score
         FROM filtered_matches fm, json_each(fm.blue_players) blue
         UNION ALL
         SELECT
           CAST(red.value AS TEXT) AS login,
           0 AS is_blue,
           fm.home_score,
           fm.away_score
         FROM filtered_matches fm, json_each(fm.red_players) red
       )
       SELECT
         ap.login AS login,
         COALESCE(NULLIF(p.nickname, ''), ap.login) AS nickname,
         COUNT(*) AS maps_played,
         SUM(
           CASE
             WHEN ap.is_blue = 1 AND ap.home_score > ap.away_score THEN 1
             WHEN ap.is_blue = 0 AND ap.away_score > ap.home_score THEN 1
             ELSE 0
           END
         ) AS won_map
       FROM all_players ap
       LEFT JOIN players p ON p.login = ap.login
       GROUP BY ap.login, nickname
       ORDER BY won_map DESC, maps_played DESC, ap.login ASC`,
    )
    .all(...params) as Array<{
    login: string;
    nickname: string;
    maps_played: number;
    won_map: number;
  }>;

  const payload = rows.map((row, index) => {
    const points = row.won_map * 3;
    const deaths = Math.max(0, row.maps_played - row.won_map);
    const kdRatio = deaths === 0 ? row.won_map : row.won_map / deaths;
    return {
      login: row.login,
      nickname: row.nickname,
      rank: index + 1,
      ladderPoints: points,
      points,
      damage: 0,
      shots: 0,
      kills: row.won_map,
      deaths,
      kdRatio: Number(kdRatio.toFixed(2)),
      accuracy: "0%",
      passesDone: 0,
      passesReceived: 0,
      ballHits: 0,
      backstabs: 0,
      backspaced: 0,
      ballGivenAway: 0,
      ballStolen: 0,
      ballPossession: "0%",
      nearMisses: 0,
      captureTries: 0,
      captures: 0,
      captureTotalPercent: "0%",
      captureTotalTime: "0:00",
      playtime: "0:00",
      mapsPlayed: row.maps_played,
      wonMap: row.won_map,
    };
  });

  res.json(payload);
});

app.get("/api/maps-stats/GetAll", (req: Request, res: Response) => {
  const { value: typeFilter, valid } = parseTournamentFilter(req.query.type);
  if (!valid) {
    return void res.status(400).json({
      error:
        "Invalid type. Allowed values: all, public, sbl, sbc, funcup, teamcup",
    });
  }

  const editionFilter = parseEdition(req.query.edition);
  if (req.query.edition !== undefined && editionFilter === null) {
    return void res.status(400).json({ error: "Invalid edition" });
  }

  if (typeFilter === "public" && editionFilter !== null) {
    return void res
      .status(400)
      .json({ error: "edition is not allowed when type=public" });
  }

  const { whereClause, params } = buildMatchFilterClause(
    typeFilter,
    editionFilter,
  );

  const rows = db
    .prepare(
      `SELECT
         COALESCE(mp.id, 0) AS mapId,
         COALESCE(NULLIF(mp.name, ''), 'Unknown') AS mapName,
         COUNT(*) AS playedCount,
         SUM(CASE WHEN m.home_score > m.away_score THEN 1 ELSE 0 END) AS blueWins,
         SUM(CASE WHEN m.away_score > m.home_score THEN 1 ELSE 0 END) AS redWins,
         SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) AS draws
       FROM matches m
       LEFT JOIN tournaments t ON t.id = m.tournament_id
       LEFT JOIN maps mp ON mp.id = m.map_id
       ${whereClause}
       GROUP BY mapId, mapName
       ORDER BY playedCount DESC, mapName ASC`,
    )
    .all(...params) as Array<{
    mapId: number;
    mapName: string;
    playedCount: number;
    blueWins: number;
    redWins: number;
    draws: number;
  }>;

  const payload = rows.map((row) => ({
    mapId: row.mapId,
    mapName: row.mapName,
    playedCount: row.playedCount,
    wonCount: row.blueWins + row.redWins,
    blueWins: row.blueWins,
    redWins: row.redWins,
    draws: row.draws,
    pickedCount: 0,
    bannedCount: 0,
    wonWhenPickedCount: 0,
    wonWhenNotPickedCount: 0,
  }));

  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`Speedball API running on http://localhost:${PORT}`);
});
