import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-xs tracking-[0.45em] text-white/70">
            MIRADA MIA
          </div>
          <div className="text-white/70">≡</div>
        </header>

        <main className="mt-10 flex-1">
          <h1 className="text-center text-xl font-semibold tracking-[0.25em] text-white/80">
            HOME
          </h1>

          <p className="mt-6 text-center text-sm text-white/60">
            Esto ya prueba que el deploy está tomando tus cambios.
          </p>

          <div className="mt-10 grid gap-3">
            <Link
              href="/mirada-astral"
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center text-sm text-white/85"
            >
              Mirada Astral
            </Link>

            <button className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center text-sm text-white/85">
              Marselles (demo)
            </button>

            <button className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center text-sm text-white/85">
              Psicomagia (demo)
            </button>

            <button className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center text-sm text-white/85">
              Sueños (demo)
            </button>
          </div>
        </main>

        <footer className="pb-2 pt-8 text-center text-xs text-white/35">
          build visible ✔
        </footer>
      </div>
    </div>
  );
}
