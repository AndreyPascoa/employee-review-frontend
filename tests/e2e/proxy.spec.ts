import { expect, test } from "@playwright/test";

test("proxy encaminha identidade e payload ao servidor configurado", async ({
  request,
}) => {
  const body = { employee_id: 12, answers: [{ question_id: 1, score: 3 }] };
  const response = await request.post("/api/evaluations", {
    headers: { "X-Leader-ID": "4" },
    data: body,
  });
  expect(response.status()).toBe(201);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({
    path: "/api/evaluations",
    method: "POST",
    leaderId: "4",
    body,
  });
});

test("proxy preserva conflitos e isola líderes entre solicitações", async ({
  request,
}) => {
  const conflict = await request.post("/api/evaluations", {
    headers: { "X-Leader-ID": "409" },
    data: {},
  });
  expect(conflict.status()).toBe(409);
  expect(await conflict.json()).toEqual({
    detail: "Avaliação semanal já enviada.",
  });
  for (const id of ["1", "4"]) {
    const response = await request.get("/api/employees", {
      headers: { "X-Leader-ID": id },
    });
    expect((await response.json()).leaderId).toBe(id);
  }
});

test("proxy rejeita caminhos e operações fora do contrato", async ({
  request,
}) => {
  for (const path of [
    "/api/period",
    "/api/admin",
    "/api/evaluations/employee/8/history",
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  expect((await request.post("/api/leaders", { data: {} })).status()).toBe(404);
  expect((await request.delete("/api/evaluations")).status()).toBe(405);
});
