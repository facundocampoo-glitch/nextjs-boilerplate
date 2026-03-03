# MIA — Deploy Checklist

Este documento describe el procedimiento oficial para desplegar MIA.

---

# 1 Repositorio

El código fuente vive en GitHub.

Antes de deploy siempre verificar:

git status

Debe mostrar:

working tree clean

---

# 2 Push obligatorio

Antes de deploy:

git push

---

# 3 Vercel

El deploy se realiza desde:

Vercel

Conectado al repositorio de GitHub.

---

# 4 Variables de entorno

Verificar que existen:

OPENAI_API_KEY  
ELEVENLABS_API_KEY

---

# 5 Endpoint principal

El endpoint del sistema es:

/api/mia

Debe responder correctamente antes del deploy.

---

# 6 Test obligatorio

Probar localmente:

curl -s http://localhost:3000/api/mia \
-H "Content-Type: application/json" \
-d '{"input":"Aries","contentType":"horoscopo_diario"}'

---

# 7 Test con debug

curl -s http://localhost:3000/api/mia \
-H "Content-Type: application/json" \
-d '{"input":"Aries","contentType":"horoscopo_diario","debug":true}'

---

# 8 Verificar prompts

Confirmar que existen:

prompts/content/

y que cada item tiene:

manifest.json

---

# 9 Regla del sistema

El comportamiento de MIA depende de:

prompts/
manifest.json

No de código hardcodeado.

---

# Fin