# Ciclo de suscripción SaaS

Estados existentes: `trial`, `active`, `past_due`, `suspended`, `cancelled` y `expired`.

## Acciones disponibles

- Asignar o cambiar plan.
- Suspender y reactivar.
- Cancelar.
- Extender prueba entre 1 y 365 días.
- Renovar con una fecha futura.

Todas las mutaciones exigen un motivo de al menos cinco caracteres, usan bloqueo transaccional y generan un evento de auditoría con antes/después. El historial se conserva en la bitácora append-only; no se sobrescribe silenciosamente.

Web y móvil exponen el mismo ciclo. La aplicación móvil utiliza selector nativo para la fecha de renovación, validación de días de prueba y confirmación explícita antes de cancelar.

Una reducción de plan nunca elimina usuarios, médicos o pacientes. La aplicación muestra el consumo real contra el máximo y genera alertas administrativas cuando existe exceso o vencimiento próximo.

Este sprint no incorpora cobro con tarjeta ni calcula MRR ficticio.
