import { ApiError, request } from "@/lib/api-client";
import type { Employee, Evaluation, TeamMember } from "./types";

// The existing API exposes latest evaluations individually. Bound concurrency
// so loading the team does not overwhelm the API as the hierarchy grows.
export async function loadTeam(
  path: string,
  options: { leaderId?: string; signal?: AbortSignal } = {},
): Promise<TeamMember[]> {
  const employees = await request<Employee[]>(path, options);
  const result: TeamMember[] = new Array(employees.length);
  let next = 0;
  async function worker() {
    while (next < employees.length) {
      options.signal?.throwIfAborted();
      const index = next++;
      const employee = employees[index];
      try {
        const latest = await request<Evaluation>(
          `/evaluations/employee/${employee.id}/latest`,
          options,
        );
        result[index] = {
          ...employee,
          latest_evaluation: latest,
          evaluationError: null,
        };
      } catch (error) {
        options.signal?.throwIfAborted();
        result[index] = {
          ...employee,
          latest_evaluation: null,
          evaluationError:
            error instanceof ApiError && error.status === 404
              ? null
              : "Consulta indisponível",
        };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(4, employees.length) }, worker),
  );
  return result;
}
