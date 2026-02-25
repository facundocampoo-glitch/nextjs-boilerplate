import Image from "next/image";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white/80">
      {children}
    </span>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-full rounded-2xl bg-[#94c7c9] px-4 py-3 text-sm font-semibold text-[#1e0d0d] active:scale-[0.99]">
      {children}
    </button>
  );
}

function GhostButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/90 active:scale-[0.99]">
      {children}
    </button>
  );
}

function NavItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`flex-1 py-3 text-xs font-semibold tracking-wide ${
        active ? "text-[#94c7c9]" : "text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen px-6 pb-28 pt-6">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold tracking-[0.18em]">MIA</div>
          <Chip>BASE · USD 12.90</Chip>
        </div>

        {/* Menu placeholder (lo conectamos luego) */}
        <button
          aria-label="Menú"
          className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/90"
        >
          menú
        </button>
      </header>

      {/* Hero */}
      <section className="mt-10">
        <div className="text-[22px] font-semibold leading-8 tracking-tight">
          mirada astral
        </div>

        <div className="mt-3 text-sm text-white/70">
          carta astral + solar + chino. texto y voz.
        </div>

        {/* Mia + QR */}
        <div className="mt-8 flex items-end justify-between gap-4">
          {/* Mia image placeholder */}
          <div className="relative h-[360px] w-[240px] overflow-hidden rounded-[28px] bg-black/35 shadow-sm">
            {/* Si ya tenés la imagen final, ponela en /public/mia.png */}
            <Image
              src="/mia.png"
              alt="Mia"
              fill
              className="object-cover opacity-95"
              priority
            />
            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_100%)]" />
          </div>

          {/* QR placeholder */}
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-28 w-28 place-items-center rounded-2xl bg-white/10">
              <div className="h-20 w-20 rounded-xl bg-white/15" />
            </div>
            <div className="text-[11px] font-medium text-white/70">
              compartir app
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-6 text-sm text-white/70">
          <span className="font-semibold text-white/90">honestidad brutal</span>{" "}
          <span className="text-white/70">— sin incienso</span>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <PrimaryButton>generar mi mirada astral</PrimaryButton>
          <div className="grid grid-cols-2 gap-3">
            <GhostButton>leer</GhostButton>
            <GhostButton>escuchar</GhostButton>
          </div>
        </div>

        {/* Shortcuts (secondary) */}
        <div className="mt-10 space-y-4">
          <div className="text-xs font-semibold tracking-[0.18em] text-white/60">
            accesos
          </div>
          <div className="space-y-3">
            <button className="w-full rounded-2xl bg-black/25 px-4 py-4 text-left">
              <div className="text-sm font-semibold text-white/90">cartas</div>
              <div className="mt-1 text-xs text-white/60">
                marselles · demo en overlay
              </div>
            </button>

            <button className="w-full rounded-2xl bg-black/25 px-4 py-4 text-left">
              <div className="text-sm font-semibold text-white/90">sueños</div>
              <div className="mt-1 text-xs text-white/60">
                interpretación · demo en overlay
              </div>
            </button>

            <button className="w-full rounded-2xl bg-black/25 px-4 py-4 text-left">
              <div className="text-sm font-semibold text-white/90">
                actos que fortalecen
              </div>
              <div className="mt-1 text-xs text-white/60">
                psicomagia · demo en overlay
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0">
        <div className="mx-auto w-full max-w-[440px] bg-[#1e0d0d]/80 backdrop-blur">
          <div className="flex border-t border-white/10">
            <NavItem label="astral" active />
            <NavItem label="marselles" />
            <NavItem label="psicomagia" />
            <NavItem label="sueños" />
          </div>
        </div>
      </nav>
    </div>
  );
}
