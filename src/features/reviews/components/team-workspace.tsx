"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Failure, Loading } from "@/components/feedback";
import { filterEmployees, formatDate, formatScore, initials } from "../model";
import { useResource } from "../use-resource";
import type { Employee, Leader, TeamMember } from "../types";
import { loadTeam } from "../team-api";
import { EmployeeDetail } from "./employee-detail";

type Props = {
  leader: Leader;
  leaders: Leader[];
  onBusyChange: (value: boolean) => void;
  onDirtyChange: (value: boolean) => void;
};

export function TeamWorkspace({
  leader,
  leaders,
  onBusyChange,
  onDirtyChange,
}: Props) {
  const leaderId = String(leader.id);
  const team = useResource<TeamMember[]>("/employees", leaderId, loadTeam);
  const refreshTeam = team.refresh;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selection, setSelection] = useState<{
    employee: Employee;
    mode: "read" | "evaluate";
  } | null>(null);
  const employees = team.data ?? [];
  const withEvaluation = employees.filter(
    (employee) => employee.latest_evaluation,
  ).length;
  const withoutEvaluation = employees.filter(
    (employee) => !employee.latest_evaluation && !employee.evaluationError,
  ).length;
  const unavailable = employees.filter(
    (employee) => employee.evaluationError,
  ).length;
  const visible = filterEmployees(employees, search, filter);

  // Reload the team on focus, without disrupting an open form.
  useEffect(() => {
    if (selection) return;
    const refresh = () => {
      if (document.visibilityState === "visible") refreshTeam();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [selection, refreshTeam]);

  if (selection)
    return (
      <EmployeeDetail
        key={selection.employee.id}
        employee={selection.employee}
        leaderId={leaderId}
        leaders={leaders}
        initialMode={selection.mode}
        onBusyChange={onBusyChange}
        onDirtyChange={onDirtyChange}
        onBack={() => {
          setSelection(null);
          team.refresh();
        }}
      />
    );

  return (
    <>
      <div className="metrics-grid" aria-label="Resumo da equipe">
        <div className="metric-card">
          <div className="metric-label">
            Pessoas na equipe{" "}
            <span className="metric-icon">
              <Icon name="people" />
            </span>
          </div>
          <div className="metric-value">
            {team.loading || team.error
              ? "—"
              : employees.length.toString().padStart(2, "0")}
          </div>
          <p>Liderados diretos e indiretos</p>
        </div>
        <div className="metric-card">
          <div className="metric-label">
            Sem avaliação{" "}
            <span className="metric-icon amber">
              <Icon name="clock" />
            </span>
          </div>
          <div className="metric-value">
            {team.loading || team.error
              ? "—"
              : withoutEvaluation.toString().padStart(2, "0")}
          </div>
          <p>Ainda sem registros de qualquer líder</p>
        </div>
        <div className="metric-card">
          <div className="metric-label">
            Com avaliação{" "}
            <span className="metric-icon green">
              <Icon name="check" />
            </span>
          </div>
          <div className="metric-value">
            {team.loading || team.error
              ? "—"
              : withEvaluation.toString().padStart(2, "0")}
          </div>
          <p>Com pelo menos um registro disponível</p>
        </div>
      </div>

      <section className="team-panel" aria-labelledby="team-title">
        <div className="panel-heading">
          <div>
            <h2 id="team-title">
              Sua equipe <span className="count-badge">{employees.length}</span>
            </h2>
            <p>Acompanhe cada pessoa e mantenha as avaliações em dia.</p>
          </div>
          <button
            type="button"
            className="button secondary small"
            disabled={team.loading}
            onClick={team.refresh}
          >
            <Icon name="refresh" size={16} />
            Atualizar
          </button>
        </div>
        <div className="team-toolbar">
          <div className="filter-tabs" aria-label="Filtrar por situação">
            {[
              ["all", "Todos"],
              ["pending", "Sem avaliação"],
              ["done", "Com avaliação"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Icon name="search" size={18} />
            <span className="sr-only">Buscar funcionário</span>
            <input
              type="search"
              placeholder="Buscar por nome ou cargo…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {unavailable > 0 && (
          <p className="notice warning" role="status">
            Não foi possível consultar {unavailable} avaliação(ões). Atualize
            para tentar novamente. Esses registros não entram nos indicadores.
          </p>
        )}
        {team.loading ? (
          <Loading label="Carregando equipe…" />
        ) : team.error ? (
          <Failure message={team.error.message} retry={team.refresh} />
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <Icon name="people" size={32} />
            <h3>
              {employees.length
                ? "Nenhum resultado encontrado"
                : "Nenhum subordinado encontrado"}
            </h3>
            <p>
              {employees.length
                ? "Tente outro nome ou ajuste o filtro de situação."
                : "Este líder ainda não possui funcionários em sua hierarquia."}
            </p>
            {employees.length > 0 && (
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="employee-table">
              <caption className="sr-only">
                Funcionários sob a liderança de {leader.name}
              </caption>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Última avaliação</th>
                  <th>Situação</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="person">
                        <span className={`avatar tone-${employee.id % 4}`}>
                          {initials(employee.name)}
                        </span>
                        <div>
                          <strong>{employee.name}</strong>
                          <span>{employee.position_name}</span>
                          <small>
                            #{employee.id} · {employee.email}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {employee.latest_evaluation ? (
                        <div className="last-review">
                          <strong>
                            {formatScore(
                              employee.latest_evaluation.weighted_score,
                            )}
                            <small> / 4</small>
                          </strong>
                          <span>
                            {formatDate(
                              employee.latest_evaluation.submitted_at,
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="muted">
                          {employee.evaluationError ?? "Ainda não avaliado"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${employee.latest_evaluation ? "complete" : "pending"}`}
                      >
                        <span />
                        {employee.evaluationError
                          ? "Indisponível"
                          : employee.latest_evaluation
                            ? "Com avaliação"
                            : "Sem avaliação"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {employee.latest_evaluation && (
                          <button
                            className="text-button"
                            aria-label={`Ver avaliação de ${employee.name}`}
                            onClick={() =>
                              setSelection({ employee, mode: "read" })
                            }
                          >
                            Ver avaliação
                          </button>
                        )}
                        <button
                          className="button secondary small"
                          aria-label={`Avaliar ${employee.name}`}
                          onClick={() =>
                            setSelection({ employee, mode: "evaluate" })
                          }
                        >
                          Avaliar <Icon name="arrow" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!team.loading && !team.error && (
          <div className="table-footer">
            <span>
              {visible.length} de {employees.length} pessoas
            </span>
            <span>
              <Icon name="lock" size={13} /> Você vê apenas a sua hierarquia
            </span>
          </div>
        )}
      </section>
      <div className="info-strip">
        <Icon name="info" size={18} />
        <p>
          Os indicadores consideram registros de qualquer líder, de todas as
          semanas. Cada líder pode enviar uma avaliação por funcionário a cada
          semana; o limite é conferido no envio.
        </p>
      </div>
    </>
  );
}
