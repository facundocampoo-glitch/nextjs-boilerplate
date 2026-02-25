export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8b1414] via-[#6e1010] to-[#140707] text-white">
      {/* Top */}
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 pt-8">
        <div className="text-xs tracking-[0.45em] text-[#84d7d7]">MIRADA MIA</div>

        {/* Hamburger */}
        <button
          aria-label="Menú"
          className="rounded-full p-2 text-[#84d7d7] active:scale-[0.98]"
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path d="M2 2H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 10H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 18H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-md px-6 pb-28 pt-16">
        <h1 className="text-center text-xl font-semibold tracking-[0.25em] text-[#84d7d7]">
          MIRADA PSICOMAGICA
        </h1>

        <div className="mt-10 space-y-4 text-lg italic text-white/90">
          <div>– ¿Qué situación te duele o te frena?</div>
          <div>– ¿Desde cuándo?</div>
          <div>– ¿Qué intentaste hasta ahora?</div>
          <div>– ¿Qué te gustaría que cambie realmente?</div>
        </div>

        <div className="mt-10 space-y-2 text-base text-white/85">
          <div>No hace falta dramatizar.</div>
          <div>Con honestidad alcanza.</div>
        </div>

        {/* Input mock */}
        <div className="mt-10">
          <div className="rounded-2xl bg-white px-5 py-4 text-[17px] text-zinc-500 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            Escribí lo que necesitás mover.
          </div>
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-md px-6 pb-6">
        <div className="flex items-end justify-between rounded-3xl bg-black/10 px-4 py-4 backdrop-blur-md">
          <NavItem label="Astral">
            <CircleIcon />
          </NavItem>
          <NavItem label="Marselles">
            <CardsIcon />
          </NavItem>
          <NavItem label="Psicomagia">
            <BottleIcon />
          </NavItem>
          <NavItem label="Sueños">
            <CloudIcon />
          </NavItem>
        </div>
      </nav>
    </div>
  );
}

function NavItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button className="flex w-[72px] flex-col items-center gap-2 text-[#84d7d7] active:scale-[0.98]">
      <div className="h-7 w-7">{children}</div>
      <div className="text-[12px] tracking-wide text-[#84d7d7]/90">{label}</div>
    </button>
  );
}

function CircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
      <path d="M7 7h10a2 2 0 0 1 2 2v10H9a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 5h10a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BottleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
      <path d="M10 3h4v4l2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V9l2-2V3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
      <path
        d="M7.5 18.5h9.2a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.7 9.8 3.7 3.7 0 0 0 7.5 18.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
