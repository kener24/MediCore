# Estados de medicamentos hospitalarios

## Indicación médica

`active` puede pasar a `acknowledged`, `in_progress`, `completed`, `suspended` o `cancelled`. Cambiar medicamento, dosis, vía, frecuencia o duración genera una nueva versión; la anterior queda suspendida y sus dosis futuras se cancelan. Las administraciones ya realizadas permanecen intactas.

## Administración programada

- `scheduled`: dosis futura.
- `due`: alcanzó la hora prevista.
- `delayed`: sigue pendiente y tiene un motivo de retraso.
- `administered`: uso confirmado, con inventario procesado.
- `omitted`: no se administró por motivo clínico u operativo.
- `refused`: el paciente rechazó después de la explicación.
- `unavailable`: no existía medicamento disponible.
- `cancelled`: la indicación se cerró, reemplazó o el paciente egresó.
- `reversed`: una administración confirmada fue anulada con restauración controlada.

Los estados terminales no se pueden convertir de nuevo en una administración. `scheduled`, `due` y `delayed` sí pueden terminar en administración o en una excepción registrada.

Cada resultado conserva `scheduled_time`, `status_recorded_at`, responsable y motivo. La API calcula `delay_minutes` sin sobrescribir la hora programada.

