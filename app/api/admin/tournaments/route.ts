const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * GET /api/admin/tournaments
 * Proxies to backend GET /api/tournaments/GetAll
 */
export async function GET() {
  const res = await fetch(`${API_URL}/api/tournaments/GetAll`);
  const data: unknown = await res.json();
  return Response.json(data, { status: res.status });
}

/**
 * POST /api/admin/tournaments
 * Proxies to backend POST /api/tournaments/CreateOne
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    tournamentType?: string;
    tournamentName?: string;
    tournamentDate?: string;
    edition?: number;
  };
  const res = await fetch(`${API_URL}/api/tournaments/CreateOne`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: body.tournamentType,
      name: body.tournamentName,
      date: body.tournamentDate,
      edition: body.edition,
    }),
  });
  const data: unknown = await res.json();
  return Response.json(data, { status: res.status });
}

/**
 * PUT /api/admin/tournaments/[id] lives in a separate dynamic route.
 * DELETE /api/admin/tournaments/[id] same.
 */
