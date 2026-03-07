import Link from "next/link";

const experiences = [
  {
    href: "/mirada-astral",
    title: "Mirada Astral",
    description: "Tu lectura base: carta astral, horóscopo solar y horóscopo chino.",
  },
  {
    href: "/suenos",
    title: "Sueños",
    description: "Interpretación onírica con lectura y voz de MIA.",
  },
  {
    href: "/psicomagia",
    title: "Psicomagia",
    description: "Actos simbólicos para mover lo que necesita transformarse.",
  },
  {
    href: "/tarot",
    title: "Tarot de Marsella",
    description: "Tirada completa con lectura y voz de MIA.",
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
            Experiencias
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
            Accede a las experiencias conectadas al backend real de MIA.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {experiences.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div className="flex h-full flex-col">
                <h2 className="text-xl font-medium tracking-tight">
                  {item.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-white/65">
                  {item.description}
                </p>

                <div className="mt-6 text-sm font-medium text-white/85 transition group-hover:text-white">
                  Abrir experiencia
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}