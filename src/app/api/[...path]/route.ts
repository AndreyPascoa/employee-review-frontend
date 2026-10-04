import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const allowed =
    request.method === "GET"
      ? /^(leaders|employees|questions|evaluations\/employee\/[1-9]\d*\/latest)$/.test(
          endpoint,
        )
      : request.method === "POST" && endpoint === "evaluations";
  if (!allowed)
    return Response.json({ detail: "Rota não encontrada." }, { status: 404 });

  const headers = new Headers({ Accept: "application/json" });
  const leader = request.headers.get("X-Leader-ID");
  if (leader) headers.set("X-Leader-ID", leader);
  if (request.method === "POST")
    headers.set("Content-Type", "application/json");
  try {
    // Resolve at request time, allowing one image in local and Docker environments.
    const target = new URL(
      `/api/${endpoint}`,
      process.env.API_BASE_URL ?? "http://127.0.0.1:8000",
    );
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, private",
      },
    });
  } catch {
    return Response.json(
      { detail: "O serviço está indisponível. Tente novamente em instantes." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = forward;
export const POST = forward;
