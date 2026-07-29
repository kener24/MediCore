# Máquina de estados de hospitalización

## Estados abiertos

- `pending_admission`: ingreso creado, todavía sin consolidar cama.
- `active`: paciente internado y seguimiento habilitado.
- `observation`: seguimiento hospitalario en observación.
- `transferred`: internamiento activo después de traslado de cama.
- `discharge_pending`: reservado para el flujo completo de alta de Sprint 1.6B.

## Estados cerrados

- `discharged`: alta registrada por acción controlada existente.
- `cancelled`: ingreso cancelado con motivo.

## Transiciones certificadas

- `pending_admission -> active` al asignar cama.
- `active/observation/transferred -> transferred` al cambiar de cama.
- estado abierto `-> cancelled` con motivo y liberación controlada.

No se admite reactivar estados cerrados ni modificar directamente estado, paciente o cama por `PATCH`. Estas operaciones usan acciones transaccionales.
