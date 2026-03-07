"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Session = {
  content_type: string;
  meta?: {
    reading_id?: string;
  };
};

export default function HomePage() {
  const [history, setHistory] = useState<Session[]>([]);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("mia_user_id") || "";
    setUserId(id);

    if (!id) return;

    fetch(`/api/history?userId=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.latest) setHistory(data.latest);
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

        <section>
          <h2 className="mb-4 text-xl font-medium">
            Últimas lecturas
          </h2>

          <div className="space-y-3">

            {history.length === 0 && (
              <div className="text-white/50 text-sm">
                Aún no hay lecturas registradas.
              </div>
            )}

            {history.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"
              >
                {s.content_type}
              </div>
            ))}

          </div>
        </section>

      </div>
    </main>
  );
}