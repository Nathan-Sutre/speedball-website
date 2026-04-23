import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * GET /api/admin/teams
 * Proxies to backend GET /api/teams
 */
export async function GET() {
  const res = await fetch(`${API_URL}/api/teams`);
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
    const competitionName = String(
      formData.get("tournament") ?? formData.get("competitionName") ?? "",
    ).trim();
    const competitionType = String(
      formData.get("competitionType") ?? "",
    ).trim();

    if (!teamId || !competitionName) {
      return NextResponse.json(
        { error: "teamId and competitionName are required" },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_URL}/api/teams/${teamId}/competitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitionName, competitionType }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      return NextResponse.json(err, { status: res.status });
    }

    return NextResponse.redirect(
      new URL(`/team-stats/${teamId}`, request.url),
      303,
    );
  }

  // Forward multipart form directly to backend
  const backendRes = await fetch(`${API_URL}/api/teams`, {
    method: "POST",
    body: formData,
  });

  if (!backendRes.ok) {
    const err = (await backendRes.json()) as { error?: string };
    return NextResponse.json(err, { status: backendRes.status });
  }

  return NextResponse.redirect(new URL("/team-stats", request.url), 303);
}
