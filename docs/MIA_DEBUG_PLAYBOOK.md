# MIA — Debug Playbook

Este documento contiene los comandos oficiales para verificar
que el backend está utilizando los prompts del proyecto.

---

# 1 Verificar endpoint

curl -s http://localhost:3000/api/mia \
-H "Content-Type: application/json" \
-d '{"input":"Aries","contentType":"horoscopo_diario"}'

---

# 2 Verificación con debug

curl -s http://localhost:3000/api/mia \
-H "Content-Type: application/json" \
-d '{"input":"Aries","contentType":"horoscopo_diario","debug":true}'

Debe mostrar:

debug.manifest  
debug.loaded.base_system_dirs  
debug.loaded.item_dir  
debug.loaded.item_files

---

# 3 Verificar prompts existentes

ls prompts/content

---

# 4 Verificar estructura de un ítem

ls prompts/content/horoscopo-diario

Debe contener:

manifest.json  
prompt(s) del ítem

---

# 5 Reiniciar servidor si aparece lock

pkill -f "next dev"
rm -f .next/dev/lock
npm run dev

---

# 6 Política anti-invención

Si el contentType no existe:

El backend debe devolver error.

Nunca generar contenido inventado.

---

# Fin