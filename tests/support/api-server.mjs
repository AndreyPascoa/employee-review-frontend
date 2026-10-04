import { createServer } from "node:http";

// Transport fixture: only launched by Playwright, never imported by the app.
createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/health") return response.end('{"status":"ok"}');
  if (request.headers["x-leader-id"] === "409") {
    response.statusCode = 409;
    return response.end(
      JSON.stringify({ detail: "Avaliação semanal já enviada." }),
    );
  }
  response.statusCode = request.method === "POST" ? 201 : 200;
  response.end(
    JSON.stringify({
      path: request.url,
      method: request.method,
      leaderId: request.headers["x-leader-id"] ?? null,
      body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null,
    }),
  );
}).listen(3311, "127.0.0.1");
