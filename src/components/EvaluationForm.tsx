"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type Question = {
  id: number;
  title: string;
  weight: number;
};

type EvaluationFormProps = {
  leaderId: string;
  employeeId: number;
  onSubmittingChange: (submitting: boolean) => void;
};

export default function EvaluationForm({
  leaderId,
  employeeId,
  onSubmittingChange,
}: EvaluationFormProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyEvaluated, setAlreadyEvaluated] = useState(false);

  // Bloqueia envios simultâneos, inclusive antes de a tela atualizar.
  const sendingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuestions() {
      try {
        const response = await fetch("/api/questions", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Falha ao carregar as questões.");
        }

        const data: Question[] = await response.json();

        if (data.length !== 6) {
          throw new Error("O formulário precisa ter seis questões.");
        }

        if (!controller.signal.aborted) {
          setQuestions(data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadError(
            "Não foi possível carregar o formulário. Volte para a equipe e tente novamente.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadQuestions();

    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sendingRef.current || submitted || alreadyEvaluated) {
      return;
    }

    const complete =
      questions.length === 6 &&
      questions.every((question) =>
        [1, 2, 3, 4].includes(scores[question.id]),
      );

    if (!complete) {
      setSubmitError("Responda às seis questões antes de enviar.");
      return;
    }

    sendingRef.current = true;
    setSubmitting(true);
    onSubmittingChange(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Leader-ID": leaderId,
        },
        body: JSON.stringify({
          employee_id: employeeId,
          answers: questions.map((question) => ({
            question_id: question.id,
            score: scores[question.id],
          })),
        }),
      });

      if (response.status === 409) {
        setAlreadyEvaluated(true);
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          detail?: unknown;
        } | null;

        const message =
          typeof body?.detail === "string"
            ? body.detail
            : "Não foi possível enviar. Confira as respostas e tente novamente.";

        setSubmitError(message);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError(
        "A conexão falhou e não foi possível confirmar o envio. Suas respostas foram mantidas. Uma nova tentativa será bloqueada se a avaliação já tiver sido salva.",
      );
    } finally {
      sendingRef.current = false;
      setSubmitting(false);
      onSubmittingChange(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-6" role="status">
        Carregando questões...
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="mt-6 text-red-700" role="alert">
        {loadError}
      </p>
    );
  }

  if (submitted) {
    return (
      <div
        className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
        role="status"
      >
        Avaliação enviada com sucesso. As respostas não podem ser
        alteradas após o envio.
      </div>
    );
  }

  if (alreadyEvaluated) {
    return (
      <div
        className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
        role="alert"
      >
        Você já avaliou esse funcionário nesta semana. A avaliação
        existente foi preservada.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <p className="text-sm text-slate-600">
        Responda às seis questões com notas de 1 a 4.
      </p>

      <fieldset disabled={submitting} className="mt-5 space-y-5">
        <legend className="sr-only">Respostas da avaliação</legend>

        {questions.map((question, index) => (
          <fieldset
            key={question.id}
            className="rounded-lg border border-slate-200 p-4"
          >
            <legend className="px-1 font-medium">
              {index + 1}. {question.title}
            </legend>

            <p className="text-sm text-slate-500">
              Peso: {question.weight}%
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              {[1, 2, 3, 4].map((score) => (
                <label
                  key={score}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 py-3"
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={score}
                    checked={scores[question.id] === score}
                    onChange={() =>
                      setScores((previous) => ({
                        ...previous,
                        [question.id]: score,
                      }))
                    }
                    required
                    className="accent-blue-700"
                  />
                  <span>{score}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <p className="text-sm text-slate-600">
          Confira suas respostas. Após enviar, não será possível
          alterá-las.
        </p>

        <button
          type="submit"
          className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar avaliação"}
        </button>
      </fieldset>

      {submitError && (
        <p className="mt-4 text-red-700" role="alert">
          {submitError}
        </p>
      )}
    </form>
  );
}