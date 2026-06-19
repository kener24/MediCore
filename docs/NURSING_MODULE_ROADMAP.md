# Roadmap Enfermería Mobile

## Sprint 4.3: Hospitalización móvil

Incluye:

- Dashboard de hospitalización.
- Listado de pacientes internados.
- Detalle de internamiento.
- Habitación y cama asignada.
- Signos vitales hospitalarios.
- Historial de signos vitales hospitalarios.
- Notas de enfermería.
- Eventos de hospitalización.
- Estado de camas en modo lectura.

## Reglas

- No mezclar triaje inicial con hospitalización.
- No consumir endpoints de caja o facturación.
- No permitir acceso a paciente, recepción, administración o superadmin.
- Todas las peticiones usan `apiClient` y `Authorization: Bearer`.

## Sprint 4.4: Rondas y medicamentos

Incluye:

- Listado de rondas de enfermería por internamiento.
- Formulario de nueva ronda.
- Listado de medicamentos por internamiento.
- Programación simple de medicamento.
- Medicamentos pendientes de la clínica.
- Acciones: administrar, omitir y retrasar.

Queda para un sprint posterior:

- Rondas hospitalarias avanzadas.
- Alertas por signos vitales críticos.
- Plan de cuidados de enfermería.
- Calendario avanzado de medicamentos.
