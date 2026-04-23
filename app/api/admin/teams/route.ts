import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type CompetitionType = "sbl" | "sbc" | "teamcup";

type TeamMatch = {
  id: string;
  opponent: string;
  map: string;
  scoreFor: number;
  scoreAgainst: number;
  pickedByTeam: boolean;
  result: "win" | "loss";
};

type TeamMapStat = {
  mapName: string;
  pickedCount: number;
  bannedCount: number;
  playedCount: number;
  wonCount: number;
  wonWhenPickedCount: number;
  wonWhenNotPickedCount: number;
};

type TeamCompetition = {
  id: string;
  name: string;
  type: CompetitionType;
  matches: TeamMatch[];
  mapStats: TeamMapStat[];
};

type SavedTeam = {
  id: string;
  name: string;
  color: string;
  logo: string;
  players: string[];
  competitions: TeamCompetition[];
};

type AppDataFile = {
  tournaments: unknown[];
  teamStats: SavedTeam[];
  playerStats: unknown[];
};

const DATA_FILE_PATH = path.join(process.cwd(), "data", "data.json");

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function detectCompetitionType(name: string): CompetitionType {
  const lower = name.toLowerCase();
  if (lower.includes("sbc") || lower.includes("championship")) {
    return "sbc";
  }

  if (lower.includes("teamcup")) {
    return "teamcup";
  }

  return "sbl";
}

async function readDataFile(): Promise<AppDataFile> {
  try {
    const raw = await fs.readFile(DATA_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppDataFile>;
    if (
      !parsed ||
      !Array.isArray(parsed.tournaments) ||
      !Array.isArray(parsed.teamStats) ||
      !Array.isArray(parsed.playerStats)
    ) {
      return { tournaments: [], teamStats: [], playerStats: [] };
    }

    return parsed as AppDataFile;
  } catch {
    return { tournaments: [], teamStats: [], playerStats: [] };
  }
}

async function writeDataFile(payload: AppDataFile) {
  await fs.writeFile(
    DATA_FILE_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf-8",
  );
}

export async function GET() {
  const data = await readDataFile();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const action = String(formData.get("action") ?? "createTeam").trim();

  if (action === "addCompetition") {
    const teamId = String(formData.get("teamId") ?? "").trim();
    const competitionName = String(
      formData.get("tournament") ?? formData.get("competitionName") ?? "",
    ).trim();
    const competitionTypeRaw = String(
      formData.get("competitionType") ?? "",
    ).trim();
    const competitionType =
      competitionTypeRaw === "sbl" ||
      competitionTypeRaw === "sbc" ||
      competitionTypeRaw === "teamcup"
        ? competitionTypeRaw
        : detectCompetitionType(competitionName);

    if (!teamId || !competitionName) {
      return NextResponse.json(
        { error: "teamId and competitionName are required" },
        { status: 400 },
      );
    }

    const current = await readDataFile();
    const team = current.teamStats.find((item) => item.id === teamId);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const duplicate = team.competitions.some(
      (competition) =>
        competition.name.trim().toLowerCase() ===
        competitionName.trim().toLowerCase(),
    );

    if (!duplicate) {
      const now = Date.now();
      const competitionId = `${competitionType}-${slugify(competitionName)}-${now}`;

      team.competitions.push({
        id: competitionId,
        name: competitionName,
        type: competitionType,
        matches: [],
        mapStats: [],
      });

      await writeDataFile(current);
    }

    return NextResponse.redirect(
      new URL(`/team-stats/${teamId}`, request.url),
      303,
    );
  }

  const tournamentName = String(formData.get("tournament") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();
  const teamColor = String(formData.get("teamColor") ?? "#f59e0b").trim();
  const login1 = String(formData.get("login1") ?? "").trim();
  const login2 = String(formData.get("login2") ?? "").trim();
  const login3 = String(formData.get("login3") ?? "").trim();
  const photoFile = formData.get("teamPhoto");

  if (!teamName || !tournamentName) {
    return NextResponse.json(
      { error: "teamName and tournament are required" },
      { status: 400 },
    );
  }

  const now = new Date();
  const baseId = slugify(teamName) || "team";
  const teamId = `${baseId}-${now.getTime()}`;
  const competitionType = detectCompetitionType(tournamentName);
  const competitionId = `${competitionType}-${slugify(tournamentName)}-${now.getTime()}`;

  // Save uploaded photo if provided
  let logoPath = "/team-placeholder.png";
  if (photoFile && photoFile instanceof File && photoFile.size > 0) {
    const ext = photoFile.name.split(".").pop() ?? "png";
    const filename = `${teamId}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "teams");
    await fs.mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);
    logoPath = `/teams/${filename}`;
  }

  const newTeam: SavedTeam = {
    id: teamId,
    name: teamName,
    color: teamColor,
    logo: logoPath,
    players: [login1, login2, login3].filter(Boolean),
    competitions: [
      {
        id: competitionId,
        name: tournamentName,
        type: competitionType,
        matches: [],
        mapStats: [],
      },
    ],
  };

  const current = await readDataFile();
  current.teamStats.push(newTeam);
  await writeDataFile(current);

  return NextResponse.redirect(new URL("/team-stats", request.url), 303);
}
