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

## Sprint 4.4 recomendado

- Rondas hospitalarias avanzadas.
- Administración de medicamentos.
- Alertas por signos vitales críticos.
- Plan de cuidados de enfermería.
