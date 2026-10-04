"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Failure, Loading } from "@/components/feedback";
import { useResource } from "../use-resource";
import { initials } from "../model";
import type { Leader } from "../types";
import { TeamWorkspace } from "./team-workspace";

const selectionKey = "selectedLeaderId";
function readSelection() {
  try {
    return localStorage.getItem(selectionKey) ?? "";
  } catch {
    return "";
  }
}
export function ReviewWorkspace() {
  const leaders = useResource<Leader[]>("/leaders");
  const [localId, setLocalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const leader = leaders.data?.find((item) => String(item.id) === localId);
  const leaderId = leader ? String(leader.id) : "";

  useEffect(() => {
    let active = true;
    // Restore once; activity in another tab must not replace an in-progress form.
    Promise.resolve(readSelection()).then((value) => {
      if (active) setLocalId(value);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty && !busy) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [busy, dirty]);

  function selectLeader(value: string) {
    if (busy) return;
    if (
      dirty &&
      !window.confirm(
        "Trocar de líder e descartar as respostas ainda não enviadas?",
      )
    )
      return;
    setDirty(false);
    setLocalId(value);
    try {
      if (value) localStorage.setItem(selectionKey, value);
      else localStorage.removeItem(selectionKey);
    } catch {
      /* Selection remains available in this browser session. */
    }
  }

  return (
    <div className="app-shell">
      <a href="#workspace" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="sidebar" aria-label="Navegação principal">
        <a className="brand" href="#workspace" aria-label="Pulso, início">
          <span className="brand-mark">
            <Icon name="chart" size={24} />
          </span>
          pulso<span className="brand-dot">.</span>
        </a>
        <p className="sidebar-label">DESENVOLVIMENTO DE PESSOAS</p>
        <a href="#workspace" className="nav-item active" aria-current="page">
          <Icon name="people" />
          Minha equipe
          <span className="nav-dot" />
        </a>
        <div className="sidebar-note">
          <span className="note-icon">
            <Icon name="star" />
          </span>
          <h2>
            Boas conversas começam
            <br />
            com um olhar atento.
          </h2>
          <p>
            Acompanhe resultados e reconheça o desenvolvimento de cada pessoa.
          </p>
        </div>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Ambiente de demonstração
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Pessoas <span>/</span> <strong>Avaliações</strong>
          </div>
          <div className="leader-control">
            <div className="leader-avatar">
              {leader ? (
                initials(leader.name)
              ) : (
                <Icon name="people" size={18} />
              )}
            </div>
            <div>
              <label htmlFor="leader-select">Líder ativo</label>
              <select
                id="leader-select"
                value={leaderId}
                disabled={leaders.loading || !!leaders.error || busy}
                onChange={(event) => selectLeader(event.target.value)}
              >
                <option value="">Selecione um líder</option>
                {leaders.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <main id="workspace" tabIndex={-1} className="workspace">
          <div className="page-heading">
            <div>
              <p className="eyebrow">PESSOAS EM EVOLUÇÃO</p>
              <h1>Avaliações de desempenho</h1>
              <p className="page-description">
                Um olhar sobre as entregas de hoje. Um caminho para o próximo
                passo.
              </p>
            </div>
            <div className="period-chip">
              <Icon name="calendar" />
              <div>
                <span>Ciclo semanal</span>
                <strong>Segunda a domingo</strong>
                <small>Horário de São Paulo</small>
              </div>
            </div>
          </div>

          {leaders.loading && <Loading label="Carregando líderes…" />}
          {leaders.error && (
            <Failure message={leaders.error.message} retry={leaders.refresh} />
          )}
          {!leaders.loading && !leaders.error && !leader && (
            <section className="welcome-panel">
              <div className="welcome-art" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <span className="welcome-person">
                  <Icon name="people" size={44} />
                </span>
                <span className="floating-check">
                  <Icon name="check" />
                </span>
              </div>
              <p className="eyebrow">COMECE PELA SUA EQUIPE</p>
              <h2>Cada pessoa tem um próximo passo.</h2>
              <p>
                Escolha um líder no seletor acima para acompanhar a equipe,
                consultar avaliações e registrar novas percepções.
              </p>
              <button
                className="button primary"
                onClick={() =>
                  document.getElementById("leader-select")?.focus()
                }
              >
                Selecionar líder <Icon name="arrow" size={16} />
              </button>
            </section>
          )}
          {leader && (
            <TeamWorkspace
              key={leaderId}
              leader={leader}
              leaders={leaders.data ?? []}
              onBusyChange={setBusy}
              onDirtyChange={setDirty}
            />
          )}

          <footer className="page-footer">
            <span>Pulso · Desenvolvimento de pessoas</span>
            <span>Uma avaliação por pessoa, por líder, a cada semana.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
