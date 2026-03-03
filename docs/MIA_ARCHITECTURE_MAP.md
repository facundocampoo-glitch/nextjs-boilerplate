# MIA — Architecture Map

## Visión general

MIA es un sistema que genera contenido utilizando prompts locales
organizados por tipo de contenido y controlados por manifest.

El backend nunca debe inventar estructura.
Todo debe existir previamente en el filesystem.

---

# Flujo general del sistema

Usuario
↓
Frontend
↓
API `/api/mia`
↓
Loader de manifests
↓
Carga de prompts base_system
↓
Carga de prompts del ítem
↓
Construcción del prompt final
↓
LLM (GPT)
↓
Respuesta
↓
Opcional: TTS ElevenLabs
↓
Frontend reproduce audio

---

# Estructura principal del proyecto
