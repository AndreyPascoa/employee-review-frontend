import { expect, test } from "@playwright/test";

import {
  carol,
  employees,
  fillAnswers,
  latest,
  mockApi,
  openLiamForm,
  selectDavid,
} from "./fixtures";

test("recupera uma seleção válida e descarta identificadores obsoletos", async ({
  page,
}) => {
  await mockApi(page);
  await selectDavid(page);
  await page.reload();
  await expect(page.getByLabel("Líder ativo", { exact: true })).toHaveValue(
    "4",
  );
  await expect(
    page.getByRole("button", { name: "Avaliar Liam Johansson", exact: true }),
  ).toBeVisible();

  await page.evaluate(() => localStorage.setItem("selectedLeaderId", "999"));
  await page.reload();
  await expect(page.getByLabel("Líder ativo", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Avaliar Liam Johansson", exact: true }),
  ).toHaveCount(0);
});

test("busca e filtros respeitam a equipe carregada", async ({ page }) => {
  await mockApi(page);
  await selectDavid(page);
  await page.getByLabel("Buscar funcionário").fill("Liam");
  await expect(
    page.getByRole("button", { name: "Avaliar Liam Johansson", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Ver avaliação de Henry Patel",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Buscar funcionário").clear();
  await page
    .getByRole("button", { name: "Com avaliação", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Ver avaliação de Henry Patel",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Avaliar Liam Johansson", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sem avaliação", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Avaliar Liam Johansson", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Ver avaliação de Henry Patel",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("uma resposta atrasada não mostra a equipe do líder anterior", async ({
  page,
}) => {
  let releaseDavid!: () => void;
  const davidWait = new Promise<void>((resolve) => {
    releaseDavid = resolve;
  });
  await mockApi(page, {
    onEmployees: async (route, leaderId) => {
      if (leaderId === "4") {
        await davidWait;
        await route.fulfill({ json: employees }).catch(() => {});
      } else {
        await route.fulfill({ json: [carol] });
      }
    },
  });
  await page.goto("/");
  const davidRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/employees") &&
      request.headers()["x-leader-id"] === "4",
  );
  await page.getByLabel("Líder ativo", { exact: true }).selectOption("4");
  await davidRequest;
  await page.getByLabel("Líder ativo", { exact: true }).selectOption("1");
  await expect(
    page.getByRole("button", { name: "Avaliar Carol Nguyen", exact: true }),
  ).toBeVisible();
  releaseDavid();
  await expect(
    page.getByRole("button", { name: "Avaliar Liam Johansson", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Líder ativo", { exact: true })).toHaveValue(
    "1",
  );
});

test("consulta a última avaliação e seu autor sem controles de edição", async ({
  page,
}) => {
  await mockApi(page);
  await selectDavid(page);
  await page
    .getByRole("button", { name: "Ver avaliação de Henry Patel", exact: true })
    .click();
  await expect(page.getByText(/^3,15/).first()).toBeVisible();
  await expect(
    page
      .getByText("Bob Sinclair", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Editar avaliação|Excluir avaliação/ }),
  ).toHaveCount(0);
});

test("consulta negada não reaproveita a avaliação vista anteriormente", async ({
  page,
}) => {
  await mockApi(page, {
    onLatest: async (route, employeeId) =>
      route.fulfill(
        employeeId === "8"
          ? { json: latest }
          : {
              status: 403,
              json: {
                detail:
                  "Você só pode consultar avaliações de seus subordinados.",
              },
            },
      ),
  });
  await selectDavid(page);
  await page
    .getByRole("button", { name: "Ver avaliação de Henry Patel", exact: true })
    .click();
  await expect(page.getByText(/^3,15/).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar para a equipe", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Avaliar Liam Johansson", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "subordinados",
  );
  await expect(page.getByText(/^3,15/)).toHaveCount(0);
});

test("revisa seis notas e envia o contrato esperado uma única vez", async ({
  page,
}) => {
  let submissions = 0;
  let releaseSubmission!: () => void;
  const submissionWait = new Promise<void>((resolve) => {
    releaseSubmission = resolve;
  });
  await mockApi(page, {
    onSubmit: async (route) => {
      submissions++;
      expect(route.request().headers()["x-leader-id"]).toBe("4");
      expect(route.request().postDataJSON()).toEqual({
        employee_id: 12,
        answers: [3, 4, 3, 2, 4, 3].map((score, index) => ({
          question_id: index + 1,
          score,
        })),
      });
      await submissionWait;
      await route.fulfill({
        status: 201,
        json: { ...latest, id: 4, leader_id: 4, employee_id: 12 },
      });
    },
  });
  await openLiamForm(page);
  await expect(
    page.getByRole("button", { name: "Confirmar envio", exact: true }),
  ).toHaveCount(0);
  await fillAnswers(page);
  await page
    .getByRole("button", { name: "Revisar avaliação", exact: true })
    .click();
  expect(submissions).toBe(0);
  await page
    .getByRole("button", { name: "Confirmar envio", exact: true })
    .click();
  await expect(page.getByLabel("Líder ativo", { exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Voltar para a equipe", exact: true }),
  ).toBeDisabled();
  releaseSubmission();
  await expect(page.getByText(/Avaliação enviada/).first()).toBeVisible();
  expect(submissions).toBe(1);
  await expect(page.getByLabel("Líder ativo", { exact: true })).toBeEnabled();
});

test("não envia formulário incompleto", async ({ page }) => {
  let submissions = 0;
  await mockApi(page, {
    onSubmit: async (route) => {
      submissions++;
      await route.fulfill({ status: 500 });
    },
  });
  await openLiamForm(page);
  const review = page.getByRole("button", {
    name: "Revisar avaliação",
    exact: true,
  });
  if (await review.isEnabled()) await review.click();
  await expect(
    page.getByRole("button", { name: "Confirmar envio", exact: true }),
  ).toHaveCount(0);
  expect(submissions).toBe(0);
  await expect(page.getByRole("radio")).toHaveCount(24);
});

test("apresenta conflito semanal sem oferecer alteração do envio existente", async ({
  page,
}) => {
  await mockApi(page, {
    onSubmit: async (route) =>
      route.fulfill({
        status: 409,
        json: { detail: "Você já avaliou esse funcionário nesta semana." },
      }),
  });
  await openLiamForm(page);
  await fillAnswers(page);
  await page
    .getByRole("button", { name: "Revisar avaliação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar envio", exact: true })
    .click();
  await expect(page.getByText(/já avaliou.*semana/i).first()).toBeVisible();
  await expect(page.getByLabel("Líder ativo", { exact: true })).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /Editar avaliação|Excluir avaliação/ }),
  ).toHaveCount(0);
});

test("falha de rede mantém respostas e permite tentar novamente", async ({
  page,
}) => {
  let submissions = 0;
  await mockApi(page, {
    onSubmit: async (route) => {
      submissions++;
      if (submissions === 1) return route.abort("failed");
      expect(route.request().postDataJSON().answers).toHaveLength(6);
      return route.fulfill({
        status: 201,
        json: { ...latest, id: 4, employee_id: 12 },
      });
    },
  });
  await openLiamForm(page);
  await fillAnswers(page);
  await page
    .getByRole("button", { name: "Revisar avaliação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar envio", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar envio", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Confirmar envio", exact: true })
    .click();
  await expect(page.getByText(/Avaliação enviada/).first()).toBeVisible();
  expect(submissions).toBe(2);
});

test("layout cabe na tela e a seleção pode ser operada pelo teclado", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  const select = page.getByLabel("Líder ativo", { exact: true });
  await select.focus();
  await expect(select).toBeFocused();
  await select.press("ArrowDown");
  await select.press("Enter");
  await expect(select).not.toHaveValue("");
  await expect(
    page.getByRole("button", { name: /Avaliar Carol Nguyen/ }),
  ).toBeVisible();
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsViewport).toBe(true);
  const search = page.getByLabel("Buscar funcionário");
  await search.focus();
  await expect(search).toBeFocused();
});

test("confirma o descarte ao trocar de líder e preserva respostas ao cancelar", async ({
  page,
}) => {
  await mockApi(page);
  await openLiamForm(page);
  await fillAnswers(page);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Líder ativo", { exact: true }).selectOption("1");
  await expect(page.getByLabel("Líder ativo", { exact: true })).toHaveValue(
    "4",
  );
  await expect(page.locator("input[type=radio]:checked")).toHaveCount(6);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Líder ativo", { exact: true }).selectOption("1");
  await expect(
    page.getByRole("button", { name: "Avaliar Carol Nguyen", exact: true }),
  ).toBeVisible();
});

test("falha na consulta não é apresentada como ausência de avaliação", async ({
  page,
}) => {
  await mockApi(page, {
    onLatest: async (route) =>
      route.fulfill({ status: 503, json: { detail: "Indisponível" } }),
  });
  await selectDavid(page);
  await expect(page.getByText("Consulta indisponível")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Sem avaliação", exact: true })
    .click();
  await expect(page.getByText("Nenhum resultado encontrado")).toBeVisible();
});

test("uma avaliação de outro líder permite abrir um novo formulário", async ({
  page,
}) => {
  await mockApi(page);
  await selectDavid(page);
  await page
    .getByRole("button", { name: "Avaliar Henry Patel", exact: true })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(24);
});

test("captura telas da equipe e do formulário", async ({ page }, testInfo) => {
  await mockApi(page);
  await selectDavid(page);
  await page.screenshot({
    path: testInfo.outputPath("equipe.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Avaliar Liam Johansson", exact: true })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(24);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("formulario.png"),
    fullPage: true,
  });
});
