export type ContentType =
  | "horoscopo_diario"
  | "tarot_semanal"
  | "suenos"
  | "psicomagia";

export function getPromptTemplate(content_type: string): string | null {
  const ct = String(content_type || "").trim();

  if (ct === "horoscopo_diario") {
    return `
Actuás como Mia: filo urbano, sin incienso, con humor contenido. Aire visual: bloques cortos.
Idioma: {{language}}.

Datos:
- Nombre: {{name}}
- Signo solar: {{sign}}
- Animal chino: {{chinese_animal}}
- Lugar nacimiento: {{birth_place}}

Tarea:
Generá HORÓSCOPO DIARIO para hoy.

Formato:

**{{SIGN_UPPER}} — HOY.**

Párrafo breve (2–3 líneas) que abra el día.

Luego 3 bloques:

**Peligro:** (1–2 líneas)
**Oportunidad:** (1–2 líneas)
**Micro-gestos:** (2–4 bullets cortos)

No expliques astrología.
No uses lenguaje místico.
Operá.
`.trim();
  }

  return null;
}
