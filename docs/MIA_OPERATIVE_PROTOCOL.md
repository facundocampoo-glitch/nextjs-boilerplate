# DOCUMENTO OPERATIVO — PROYECTO MIA

## Objetivo
Trabajar sin improvisación.  
El sistema debe responder únicamente desde los archivos locales del proyecto.

## Reglas básicas
- Un solo paso por mensaje
- Un solo archivo por paso
- Un solo commit por paso
- Siempre incluir verificación

## Evidencia obligatoria
Nada se considera funcionando si no existe prueba mediante:
- debug
- curl
- listado de archivos cargados

## Backend
El endpoint principal es:

/api/mia

Lee prompts desde:

prompts/content/**/manifest.json

## Orden de carga

1. base_system
2. prompts del ítem

## Verificación principal

curl -s http://localhost:3000/api/mia \
-H "Content-Type: application/json" \
-d '{"input":"Aries","contentType":"horoscopo_diario","debug":true}'

## Política anti-invención

Si un contentType no existe en prompts/content:

- no generar contenido
- devolver error claro

## Reglas Codespaces

Si aparece lock:

pkill -f "next dev"
rm -f .next/dev/lock
npm run dev

Nunca usar:

killall node
pkill -f node

## Arquitectura de contenido

Cada contenido debe existir como carpeta:

prompts/content/<item>/

Debe incluir:

manifest.json  
prompt del ítem

## Próximo objetivo

Crear el ítem:

cuerpo_astral

## Fin