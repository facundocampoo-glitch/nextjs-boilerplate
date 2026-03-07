import Link from "next/link";

const todayReadings = [
  {
    title: "Horóscopo Solar",
    description: "Lectura programada del clima solar.",
    href: "/horoscopo",
  },
  {
    title: "Horóscopo Chino",
    description: "Espacio reservado para la lectura programada china.",
    href: "#",
  },
];

const exploreItems = [
  {
    title: "Sueños",
    description: "Interpretación onírica con lectura y voz de MIA.",
    href: "/suenos",
  },
  {
    title: "Psicomagia",
    description: "Actos simbólicos para mover lo que necesita transformarse.",
    href: "/psicomagia",
  },
  {
    title: "Tarot de Marsella",
    description: "Tirada completa con lectura y voz de MIA.",
    href: "/tarot",
  },
];

export default function HomePage() {
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

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
            Accesos base del sistema conectados al backend real de MIA.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium tracking-tight">
            Tu Mirada Astral
          </h2>

          <Link
            href="/mirada-astral"
            className="block rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            <h3 className="text-lg font-medium">Lectura base</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Carta astral, horóscopo solar y horóscopo chino en una sola lectura.
            </p>
            <div className="mt-5 text-sm font-medium text-white/85">
              Abrir Mirada Astral
            </div>
          </Link>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium tracking-tight">
            Lecturas de hoy
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {todayReadings.map((item) =>
              item.href === "#" ? (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    {item.description}
                  </p>
                  <div className="mt-5 text-sm font-medium text-white/40">
                    Próximamente
                  </div>
                </div>
              ) : (
                <Link
                  key={item.title}
                  href={item.href}
                  className="block rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    {item.description}
                  </p>
                  <div className="mt-5 text-sm font-medium text-white/85">
                    Abrir lectura
                  </div>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium tracking-tight">
            Explorar
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {exploreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <h3 className="text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {item.description}
                </p>
                <div className="mt-5 text-sm font-medium text-white/85">
                  Abrir experiencia
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-medium tracking-tight">
            Historial
          </h2>

          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm leading-6 text-white/55">
              Espacio reservado para guardar y mostrar lecturas previas del usuario.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}