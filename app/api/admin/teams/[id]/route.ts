const API_URL = process.env.API_URL ?? "http://localhost:3001";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/api/teams/${id}`);
  const data: unknown = await res.json();
  return Response.json(data, { status: res.status });
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body: unknown = await req.json();
  const res = await fetch(`${API_URL}/api/teams/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return Response.json(data, { status: res.status });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/api/teams/${id}`, { method: "DELETE" });
  if (res.status === 204) return new Response(null, { status: 204 });
  const data: unknown = await res.json();
  return Response.json(data, { status: res.status });
}
