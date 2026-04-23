const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * GET /api/admin/tournaments
 * Proxies to backend GET /api/tournaments
 */
export async function GET() {
  const res = await fetch(`${API_URL}/api/tournaments`);
  const data: unknown = await res.json();
  return Response.json(data, { status: res.status });
}

/**
 * POST /api/admin/tournaments
 * Proxies to backend POST /api/tournaments
 */
export async function POST(req: Request) {
  const body: unknown = await req.json();
  const res = await fetch(`${API_URL}/api/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return Response.json(data, { status: res.status });
}

/**
 * PUT /api/admin/tournaments/[id] lives in a separate dynamic route.
 * DELETE /api/admin/tournaments/[id] same.
 */
