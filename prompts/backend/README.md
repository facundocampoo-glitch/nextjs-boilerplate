# MIA Backend

Objetivo: exponer un endpoint /generate que:
- reciba content_type + user_id + payload
- cargue prompts desde /prompts
- arme el paquete de generación (system_prompt + content_prompt + runtime_context)
- luego llame al modelo (en un paso posterior)

Regla: el backend decide el contexto, el prompt ejecuta.
