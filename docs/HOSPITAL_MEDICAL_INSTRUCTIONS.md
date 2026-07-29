# Indicaciones médicas hospitalarias

Las indicaciones hospitalarias están separadas de la orden diagnóstica ambulatoria y de la administración de medicamentos.

Estados certificados:

- `active`: creada por médico.
- `acknowledged`: enfermería confirma lectura.
- `in_progress`: ejecución iniciada.
- `completed`: ejecución finalizada.
- `suspended` o `cancelled`: cambio médico con motivo.

`acknowledged_at` y `completed_at` son independientes. Confirmar lectura nunca completa la indicación.

Endpoints:

- `GET/POST /api/hospitalization/admissions/{id}/instructions/`
- acciones `acknowledge`, `start`, `complete`, `suspend` y `cancel`.

Cada transición conserva responsable, fecha, estado anterior/nuevo y auditoría.
