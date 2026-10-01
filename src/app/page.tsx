"use client";

import { useEffect, useState } from "react";
import EmployeesList from "@/components/EmployeesList";

type Leader = {
  id: number;
  name: string;
};

export default function Home() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeaders() {
      try {
        const response = await fetch("/api/leaders", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Não foi possível carregar os líderes.");
        }

        const data: Leader[] = await response.json();

        if (controller.signal.aborted) return;

        setLeaders(data);

        // Recupera a seleção anterior, se o navegador permitir.
        try {
          const savedId = localStorage.getItem("selectedLeaderId");

          if (
            savedId &&
            data.some((leader) => String(leader.id) === savedId)
          ) {
            setSelectedLeaderId(savedId);
          }
        } catch {
          // A seleção continua funcionando sem armazenamento local.
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Não foi possível carregar os líderes.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadLeaders();

    return () => controller.abort();
  }, []);

  function selectLeader(value: string) {
    setSelectedLeaderId(value);

    try {
      if (value) {
        localStorage.setItem("selectedLeaderId", value);
      } else {
        localStorage.removeItem("selectedLeaderId");
      }
    } catch {
      // Mantém a seleção enquanto a página estiver aberta.
    }
  }

  const selectedLeader = leaders.find(
    (leader) => String(leader.id) === selectedLeaderId,
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-semibold">
          Avaliação de funcionários
        </h1>

        <p className="mt-2 text-slate-600">
          Selecione o líder para começar.
        </p>

        {loading && (
          <p className="mt-6" role="status">
            Carregando líderes...
          </p>
        )}

        {error && (
          <p className="mt-6 text-red-700" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="mt-6">
            <label
              htmlFor="leader"
              className="mb-2 block font-medium"
            >
              Líder
            </label>

            <select
              id="leader"
              value={selectedLeaderId}
              onChange={(event) => selectLeader(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3"
            >
              <option value="">Selecione um líder</option>

              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>

            {selectedLeader && (
              <EmployeesList
                key={selectedLeaderId}
                leaderId={selectedLeaderId}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}