import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

function sanitizeBaseFileName(input: string): string {
  const base = input
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "team";
}

function resolveImageExtension(file: File): string {
  const fromName = path.extname(file.name || "").toLowerCase();
  if (fromName) {
    return fromName;
  }

  const byMime: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/svg+xml": ".svg",
  };

  return byMime[file.type.toLowerCase()] ?? ".png";
}

async function saveTeamLogo(file: File): Promise<string> {
  const teamsDir = path.join(process.cwd(), "public", "teams");
  await mkdir(teamsDir, { recursive: true });

  const ext = resolveImageExtension(file);
  const base = sanitizeBaseFileName(file.name || "team");
  const filename = `${base}-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(teamsDir, filename), buffer);

  return `/teams/${filename}`;
}

/**
 * GET /api/admin/teams
 * Proxies to backend GET /api/teams
 */
export async function GET() {
  const res = await fetch(`${API_URL}/api/teams/GetAll`);
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/**
 * POST /api/admin/teams
 * Proxies multipart form data to backend POST /api/teams
 * Also handles action=addCompetition by calling POST /api/teams/:id/competitions
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const action = String(formData.get("action") ?? "createTeam").trim();

  if (action === "addCompetition") {
    const teamId = String(formData.get("teamId") ?? "").trim();
    const tournamentIdRaw = String(formData.get("tournamentId") ?? "").trim();
    const tournamentId = Number.parseInt(tournamentIdRaw, 10);
    const competitionName = String(
      formData.get("tournament") ?? formData.get("competitionName") ?? "",
    ).trim();

    if (!teamId || (!Number.isInteger(tournamentId) && !competitionName)) {
      return NextResponse.json(
        { error: "teamId and tournamentId (or competitionName) are required" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(
      `${API_URL}/api/teams/${teamId}/competitions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: Number.isInteger(tournamentId)
            ? tournamentId
            : undefined,
          competitionName: competitionName || undefined,
        }),
      },
    );

    if (!backendRes.ok) {
      const err = (await backendRes.json()) as { error?: string };
      return NextResponse.json(
        { error: err.error ?? "Failed to add competition" },
        { status: backendRes.status },
      );
    }

    return NextResponse.redirect(
      new URL(`/team-stats/${teamId}`, request.url),
      303,
    );
  }

  const teamName = String(formData.get("teamName") ?? "").trim();
  const teamColor = String(formData.get("teamColor") ?? "").trim();
  const tournamentName = String(formData.get("tournament") ?? "").trim();
  const teamPhoto = formData.get("teamPhoto");

  if (!teamName) {
    return NextResponse.json(
      { error: "teamName is required" },
      { status: 400 },
    );
  }

  // Tournament is optional for team creation.
  void tournamentName;

  let logoPath: string | undefined;
  if (teamPhoto instanceof File && teamPhoto.size > 0) {
    if (!teamPhoto.type.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: "teamPhoto must be an image file" },
        { status: 400 },
      );
    }

    logoPath = await saveTeamLogo(teamPhoto);
  }

  const backendRes = await fetch(`${API_URL}/api/teams/CreateOne`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: teamName,
      color: teamColor || undefined,
      logo: logoPath,
    }),
  });

  if (!backendRes.ok) {
    const err = (await backendRes.json()) as { error?: string };
    return NextResponse.json(err, { status: backendRes.status });
  }

  return NextResponse.redirect(new URL("/team-stats", request.url), 303);
}
