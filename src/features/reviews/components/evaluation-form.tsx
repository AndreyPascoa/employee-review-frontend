"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Failure, Loading } from "@/components/feedback";
import { ApiError, request } from "@/lib/api-client";
import { useResource } from "../use-resource";
import { formatScore, weightedScore } from "../model";
import type {
  CreatedEvaluation,
  Employee,
  EvaluationInput,
  Question,
  Score,
} from "../types";

type Props = {
  employee: Employee;
  leaderId: string;
  onBusyChange: (value: boolean) => void;
  onDirtyChange: (value: boolean) => void;
  onSaved: () => void;
  onConflict: () => void;
};

export function EvaluationForm({
  employee,
  leaderId,
  onBusyChange,
  onDirtyChange,
  onSaved,
  onConflict,
}: Props) {
  const questions = useResource<Question[]>("/questions");
  const [scores, setScores] = useState<Record<number, Score>>({});
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const data = questions.data ?? [];
  const validQuestions =
    data.length === 6 &&
    new Set(data.map((question) => question.id)).size === 6;
  const answered = data.filter((question) => scores[question.id]).length;
  const preview = weightedScore(data, scores);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validQuestions || answered !== data.length) {
      setError("Responda às seis questões antes de continuar.");
      const missing = data.find((question) => !scores[question.id]);
      if (missing) document.getElementById(`question-${missing.id}-1`)?.focus();
      return;
    }
    setError(null);
    setReviewing(true);
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function submit() {
    if (sending.current || !reviewing || preview === null) return;
    sending.current = true;
    setSubmitting(true);
    onBusyChange(true);
    setError(null);
    const body: EvaluationInput = {
      employee_id: employee.id,
      answers: data.map((question) => ({
        question_id: question.id,
        score: scores[question.id],
      })),
    };
    try {
      await request<CreatedEvaluation>("/evaluations", { leaderId, body });
      onDirtyChange(false);
      onSaved();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        onDirtyChange(false);
        onConflict();
      } else if (
        failure instanceof ApiError &&
        (failure.status === 0 || failure.status >= 500)
      ) {
        setError(
          "Não foi possível confirmar o envio. Suas respostas foram mantidas. Você pode tentar novamente: o sistema impede uma avaliação duplicada.",
        );
      } else {
        setError(
          failure instanceof Error
            ? failure.message
            : "Não foi possível enviar a avaliação.",
        );
      }
    } finally {
      sending.current = false;
      setSubmitting(false);
      onBusyChange(false);
    }
  }

  if (questions.loading) return <Loading label="Carregando questões…" />;
  if (questions.error)
    return (
      <Failure message={questions.error.message} retry={questions.refresh} />
    );
  if (!validQuestions)
    return (
      <Failure
        message="O questionário está incompleto. Atualize para tentar novamente."
        retry={questions.refresh}
      />
    );

  return (
    <section className="review-form" aria-labelledby="form-title">
      <div className="form-heading">
        <div>
          <p className="eyebrow">
            {reviewing
              ? "ETAPA 2 DE 2 · CONFERÊNCIA"
              : "ETAPA 1 DE 2 · SUA PERCEPÇÃO"}
          </p>
          <h3 id="form-title" tabIndex={-1} ref={heading}>
            {reviewing
              ? "Revise antes de enviar"
              : "Um olhar para cada competência"}
          </h3>
          <p>
            {reviewing
              ? "Confira as notas. Após o envio, as respostas ficam registradas e não podem ser alteradas."
              : "Escolha uma nota de 1 a 4 para cada um dos seis critérios."}
          </p>
        </div>
        <span className="form-counter">{answered}/6 respondidas</span>
      </div>
      {error && <Failure message={error} />}
      {reviewing ? (
        <div>
          <dl className="review-summary">
            {data.map((question) => (
              <div key={question.id}>
                <dt>
                  {question.title}
                  <small>Peso {question.weight}%</small>
                </dt>
                <dd>
                  {scores[question.id]}
                  <span> / 4</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="score-preview">
            <span>Prévia da nota ponderada</span>
            <strong>
              {preview !== null ? formatScore(preview) : "—"}
              <small> / 4</small>
            </strong>
          </div>
          <div className="notice">
            <Icon name="lock" />
            <p>
              O envio é definitivo e conta como sua avaliação de{" "}
              {employee.name.split(" ")[0]} nesta semana.
            </p>
          </div>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={submitting}
              onClick={() => {
                setReviewing(false);
                setError(null);
              }}
            >
              Voltar às respostas
            </button>
            <button
              className="button primary"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <>
                  <span className="spinner small" />
                  Enviando…
                </>
              ) : (
                <>
                  Confirmar envio <Icon name="check" size={17} />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={review} noValidate>
          <div className="question-list">
            {data.map((question, index) => (
              <fieldset key={question.id} className="question">
                <legend>
                  <span className="question-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {question.title}
                </legend>
                <div className="question-body">
                  <span className="weight-label">Peso {question.weight}%</span>
                  <div className="score-options">
                    {([1, 2, 3, 4] as const).map((score) => (
                      <label
                        key={score}
                        className={
                          scores[question.id] === score ? "selected" : ""
                        }
                      >
                        <input
                          id={`question-${question.id}-${score}`}
                          type="radio"
                          name={`question-${question.id}`}
                          value={score}
                          checked={scores[question.id] === score}
                          onChange={() => {
                            setScores((previous) => ({
                              ...previous,
                              [question.id]: score,
                            }));
                            onDirtyChange(true);
                            setError(null);
                          }}
                          required
                        />
                        <span>{score}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="form-actions">
            <span className="muted">
              {answered === 6
                ? "Tudo pronto para revisar."
                : "Todas as questões são obrigatórias."}
            </span>
            <button type="submit" className="button primary">
              Revisar avaliação <Icon name="arrow" size={17} />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
