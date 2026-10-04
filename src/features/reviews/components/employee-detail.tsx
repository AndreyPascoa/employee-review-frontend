"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Failure, Loading } from "@/components/feedback";
import { useResource } from "../use-resource";
import { formatDate, formatScore, initials } from "../model";
import type { Employee, Evaluation, Leader } from "../types";
import { EvaluationForm } from "./evaluation-form";

type Props = {
  employee: Employee;
  leaderId: string;
  leaders: Leader[];
  initialMode: "read" | "evaluate";
  onBusyChange: (value: boolean) => void;
  onDirtyChange: (value: boolean) => void;
  onBack: () => void;
};

function EvaluationRecord({
  evaluation,
  leaders,
}: {
  evaluation: Evaluation;
  leaders: Leader[];
}) {
  return (
    <article className="evaluation-record">
      <div className="evaluation-overview">
        <div>
          <span className="eyebrow">AVALIAÇÃO REGISTRADA</span>
          <h3>{formatDate(evaluation.submitted_at, true)}</h3>
          <p>
            Por{" "}
            <strong>
              {leaders.find((leader) => leader.id === evaluation.leader_id)
                ?.name ?? `Líder #${evaluation.leader_id}`}
            </strong>{" "}
            · Semana de {formatDate(evaluation.week_start)} · São Paulo
          </p>
        </div>
        <div className="score-result">
          <span>Nota ponderada</span>
          <strong>
            {formatScore(evaluation.weighted_score)}
            <small> / 4</small>
          </strong>
        </div>
      </div>
      <dl className="answer-list">
        {evaluation.answers.map((answer, index) => (
          <div key={answer.question_id}>
            <dt>
              <span className="question-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                {answer.title}
                <small>Peso {answer.weight}%</small>
              </div>
            </dt>
            <dd>
              <div className="score-bars" aria-hidden="true">
                {[1, 2, 3, 4].map((value) => (
                  <span
                    key={value}
                    className={value <= answer.score ? "filled" : ""}
                  />
                ))}
              </div>
              <strong>
                {answer.score}
                <span> / 4</span>
              </strong>
            </dd>
          </div>
        ))}
      </dl>
      <div className="record-footer">
        <Icon name="lock" size={14} />
        Respostas registradas · somente leitura<span>#{evaluation.id}</span>
      </div>
    </article>
  );
}

export function EmployeeDetail({
  employee,
  leaderId,
  leaders,
  initialMode,
  onBusyChange,
  onDirtyChange,
  onBack,
}: Props) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState<"saved" | "conflict" | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const latest = useResource<Evaluation>(
    `/evaluations/employee/${employee.id}/latest`,
    leaderId,
  );

  useEffect(() => {
    title.current?.focus();
  }, []);
  const unauthorized = latest.error && latest.error.status !== 404;

  function back() {
    if (busy) return;
    if (
      dirty &&
      !window.confirm(
        "Voltar para a equipe e descartar as respostas ainda não enviadas?",
      )
    )
      return;
    onDirtyChange(false);
    onBack();
  }

  function finish(result: "saved" | "conflict") {
    setNotice(result);
    setLocked(true);
    setMode("read");
    latest.refresh();
    requestAnimationFrame(() => title.current?.focus());
  }

  return (
    <div className="detail-area">
      <button className="back-button" disabled={busy} onClick={back}>
        <Icon name="back" size={18} />
        Voltar para a equipe
      </button>
      <section className="detail-panel">
        <header className="employee-heading">
          <span className={`avatar large tone-${employee.id % 4}`}>
            {initials(employee.name)}
          </span>
          <div>
            <p className="eyebrow">FUNCIONÁRIO #{employee.id}</p>
            <h2 ref={title} tabIndex={-1}>
              {employee.name}
            </h2>
            <p>
              {employee.position_name} <span>·</span> {employee.email}
            </p>
          </div>
          <span className={`badge ${locked ? "complete" : "pending"}`}>
            <span />
            {locked ? "Envio confirmado nesta semana" : "Ciclo semanal"}
          </span>
        </header>
        {notice && (
          <div
            className={`notice ${notice === "saved" ? "success" : "warning"}`}
            role="status"
          >
            <Icon name={notice === "saved" ? "check" : "info"} />
            <div>
              <strong>
                {notice === "saved"
                  ? "Avaliação enviada"
                  : "Você já avaliou este funcionário nesta semana"}
              </strong>
              <p>
                {notice === "saved"
                  ? "As seis respostas foram registradas. A consulta abaixo mostra a avaliação mais recente disponível, inclusive de outro líder."
                  : "A avaliação existente foi preservada. Um novo envio será permitido no próximo ciclo."}
              </p>
            </div>
          </div>
        )}
        {latest.loading ? (
          <Loading label="Consultando avaliações…" />
        ) : unauthorized ? (
          <Failure message={latest.error!.message} retry={latest.refresh} />
        ) : mode === "evaluate" && !locked ? (
          <EvaluationForm
            employee={employee}
            leaderId={leaderId}
            onBusyChange={(value) => {
              setBusy(value);
              onBusyChange(value);
            }}
            onDirtyChange={(value) => {
              setDirty(value);
              onDirtyChange(value);
            }}
            onSaved={() => finish("saved")}
            onConflict={() => finish("conflict")}
          />
        ) : (
          <>
            <div className="detail-toolbar">
              <h3>Última avaliação</h3>
              {!locked && (
                <button
                  className="button primary small"
                  onClick={() => {
                    setMode("evaluate");
                    setNotice(null);
                  }}
                >
                  Avaliar funcionário <Icon name="arrow" size={15} />
                </button>
              )}
            </div>
            {latest.data ? (
              <EvaluationRecord evaluation={latest.data} leaders={leaders} />
            ) : (
              <div className="empty-state">
                <Icon name="chart" size={32} />
                <h3>A primeira avaliação começa com você</h3>
                <p>Este funcionário ainda não possui avaliações registradas.</p>
              </div>
            )}
          </>
        )}
      </section>
      <div className="info-strip">
        <Icon name="info" size={18} />
        <p>
          As avaliações de outros líderes também estão disponíveis para
          consulta. Seu limite semanal é independente desses registros.
        </p>
      </div>
    </div>
  );
}
