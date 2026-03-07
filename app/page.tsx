"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Session = {
  content_type: string;
  created_at?: string;
  createdAt?: string;
  timestamp?: string;
  ts?: string;
  meta?: {
    reading_id?: string;
    created_at?: string;
    createdAt?: string;
    timestamp?: string;
    ts?: string;
  };
};

function getSessionDate(session: Session): Date | null {
  const raw =
    session.created_at ||
    session.createdAt ||
    session.timestamp ||
    session.ts ||
    session.meta?.created_at ||
    session.meta?.createdAt ||
    session.meta?.timestamp ||
    session.meta?.ts;

  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeTime(session: Session): string {
  const date = getSessionDate(session);
  if (!date) return "sin fecha";

  const now = Date.now();
  const diffMs = now - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "hace unos segundos";

  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return minutes === 1 ? "hace 1 minuto" : `hace ${minutes} minutos`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return hours === 1 ? "hace 1 hora" : `hace ${hours} horas`;
  }

  if (diffMs < 2 * day) return "ayer";

  const days = Math.floor(diffMs / day);
  if (days < 7) return `hace ${days} días`;

  return date.toLocaleDateString("es-AR");
}

export default function HomePage() {
  const [history, setHistory] = useState<Session[]>([]);
  const [lastReading, setLastReading] = useState<Session | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("mia_user_id");

    if (!userId) return;

    fetch(`/api/history?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.latest) setHistory(data.latest);
        if (data?.lastReading) setLastReading(data.lastReading);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-white/40">
            Mirada MIA
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Dashboard
          </h1>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium">Tu Mirada Astral</h2>

          <Link
            href="/mirada-astral"
            className="block rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            Abrir lectura base
          </Link>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium">Explorar</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/suenos"
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              Sueños
            </Link>

            <Link
              href="/psicomagia"
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              Psicomagia
            </Link>

            <Link
              href="/tarot"
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              Tarot de Marsella
            </Link>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium">Última lectura</h2>

          {!lastReading && (
            <div className="text-sm text-white/50">
              Aún no hay lecturas registradas.
            </div>
          )}

          {lastReading && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-2 text-sm text-white/70">Tipo</div>

              <div className="text-lg font-medium">
                {lastReading.content_type}
              </div>

              <div className="mt-3 text-sm text-white/50">
                {formatRelativeTime(lastReading)}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-medium">Historial reciente</h2>

          <div className="space-y-3">
            {history.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="text-sm font-medium">{s.content_type}</div>
                <div className="mt-1 text-xs text-white/50">
                  {formatRelativeTime(s)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}