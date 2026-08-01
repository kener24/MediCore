# Metricas del dashboard de clinica

`GET /api/clinic-admin/dashboard/` agrega en backend datos de la clinica autenticada.

## Periodos

- `today`
- `7d`
- `month`
- `custom`, con fechas validas y maximo 92 dias

La zona horaria procede de `ClinicSettings`. No se permiten fechas futuras.

## Grupos

- Operacion: citas, no asistencia, espera, consulta y hospitalizacion.
- Finanzas: facturado, pagado, saldo, cajas abiertas y diferencias.
- Inventario: agotados, bajo minimo y lotes por vencer/vencidos.
- Usuarios: activos, inactivos, medicos, sesiones y bloqueos.
- Estado: portal, modalidades, caja y disponibilidad fiscal.

No se descargan listas completas en movil y no se exponen diagnosticos, notas clinicas, CAI, RTN de pacientes ni detalle financiero individual.
