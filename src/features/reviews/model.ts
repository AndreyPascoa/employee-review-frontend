import type { TeamMember, Question, Score } from "./types";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function formatScore(value: string | number) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

export function filterEmployees(
  employees: TeamMember[],
  search: string,
  filter: string,
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const term = normalize(search.trim());
  return employees.filter((employee) => {
    const matches = normalize(
      `${employee.name} ${employee.email} ${employee.position_name} ${employee.id}`,
    ).includes(term);
    return (
      matches &&
      (filter === "all" ||
        (!employee.evaluationError &&
          Boolean(employee.latest_evaluation) === (filter === "done")))
    );
  });
}

export function weightedScore(
  questions: Question[],
  scores: Record<number, Score>,
) {
  const total = questions.reduce((sum, question) => sum + question.weight, 0);
  if (!total || questions.some((question) => !scores[question.id])) return null;
  return (
    questions.reduce(
      (sum, question) => sum + scores[question.id] * question.weight,
      0,
    ) / total
  );
}
