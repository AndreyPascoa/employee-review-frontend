import { expect, type Page, type Route } from "@playwright/test";

// These responses exercise the browser UI. They do not replace backend integration tests.
export const questions = [
  { id: 1, title: "Entrega de Resultados", weight: 25 },
  { id: 2, title: "Execução e Qualidade do Trabalho", weight: 20 },
  { id: 3, title: "Capacidade de Aprendizado e Desenvolvimento", weight: 20 },
  { id: 4, title: "Resolução de Problemas e Pensamento Crítico", weight: 15 },
  { id: 5, title: "Colaboração, Influência e Liderança", weight: 10 },
  { id: 6, title: "Visão Estratégica e Potencial de Crescimento", weight: 10 },
];

export const leaders = [
  { id: 1, name: "Alice Hartman" },
  { id: 2, name: "Bob Sinclair" },
  { id: 4, name: "David Okafor" },
];

export const latest = {
  id: 3,
  leader_id: 2,
  employee_id: 8,
  week_start: "2026-09-28",
  submitted_at: "2026-10-01T22:31:53.550516Z",
  weighted_score: "3.1500000000000000",
  answers: questions.map((question, index) => ({
    question_id: question.id,
    title: question.title,
    weight: question.weight,
    score: [3, 4, 3, 2, 4, 3][index],
  })),
};

export const employees = [
  {
    id: 8,
    name: "Henry Patel",
    email: "henry.patel@company.com",
    position_name: "Senior Software Engineer",
  },
  {
    id: 10,
    name: "James Watanabe",
    email: "james.watanabe@company.com",
    position_name: "Software Engineer",
  },
  {
    id: 12,
    name: "Liam Johansson",
    email: "liam.johansson@company.com",
    position_name: "Software Engineer",
  },
];

export const carol = {
  id: 3,
  name: "Carol Nguyen",
  email: "carol.nguyen@company.com",
  position_name: "CFO",
};

type ApiOptions = {
  onEmployees?: (route: Route, leaderId: string) => Promise<void>;
  onSubmit?: (route: Route) => Promise<void>;
  onLatest?: (route: Route, employeeId: string) => Promise<void>;
};

export async function mockApi(page: Page, options: ApiOptions = {}) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const leaderId = request.headers()["x-leader-id"];

    if (path === "/api/leaders") {
      return route.fulfill({ json: leaders });
    }
    if (path === "/api/questions") {
      return route.fulfill({ json: questions });
    }
    if (path === "/api/employees") {
      if (options.onEmployees) return options.onEmployees(route, leaderId);
      return route.fulfill({ json: leaderId === "1" ? [carol] : employees });
    }
    if (path === "/api/evaluations" && request.method() === "POST") {
      if (options.onSubmit) return options.onSubmit(route);
      return route.fulfill({
        status: 201,
        json: {
          id: 4,
          leader_id: Number(leaderId),
          employee_id: request.postDataJSON().employee_id,
          week_start: "2026-09-28",
          submitted_at: "2026-10-01T23:00:00Z",
        },
      });
    }
    const evaluationPath = path.match(
      /\/evaluations\/employee\/(\d+)\/latest$/,
    );
    if (evaluationPath) {
      const employeeId = evaluationPath[1];
      if (options.onLatest) return options.onLatest(route, employeeId);
      return employeeId === "8"
        ? route.fulfill({ json: latest })
        : route.fulfill({
            status: 404,
            json: { detail: "Esse funcionário ainda não possui avaliação." },
          });
    }
    throw new Error(
      `Unexpected API request in browser test: ${request.method()} ${path}`,
    );
  });
}

export async function selectDavid(page: Page) {
  await page.goto("/");
  await page.getByLabel("Líder ativo", { exact: true }).selectOption("4");
  await expect(
    page.getByRole("button", { name: "Avaliar Liam Johansson", exact: true }),
  ).toBeVisible();
}

export async function openLiamForm(page: Page) {
  await selectDavid(page);
  await page
    .getByRole("button", { name: "Avaliar Liam Johansson", exact: true })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(24);
}

export async function fillAnswers(page: Page) {
  for (let index = 0; index < questions.length; index++) {
    await page
      .getByRole("group", { name: new RegExp(questions[index].title) })
      .getByRole("radio", {
        name: String([3, 4, 3, 2, 4, 3][index]),
        exact: true,
      })
      .check();
  }
}
