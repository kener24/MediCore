# Evidencia de pruebas de produccion

## Sprint 1.4

### Resultado local

- `python manage.py check`: aprobado, 0 errores.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- Pruebas focalizadas Sprint 1.4: 7/7 aprobadas.
- Regresion facturacion/admisiones/auditoria/cuentas/pacientes: 142/142 aprobadas.
- Suite completa Django: 305/305 aprobadas en 1016.330 segundos.
- TypeScript web: aprobado.
- Build Vite: aprobado, 1850 modulos.
- ESLint: 0 errores; 60 advertencias preexistentes de deuda tecnica.
- TypeScript movil: aprobado.
- Expo Doctor: 18/18 controles aprobados.

### Produccion

- Respaldo previo: `/var/backups/medicore/sprint14-20260728-165357`.
- Respaldo incluye dump MySQL comprimido, `.env` protegido, media, Nginx, servicio, bundle Git y sumas SHA-256.
- Commit desplegado: `359cd2d`.
- Migracion `billing.0009`: aplicada correctamente en MySQL.
- `python manage.py check`: sin errores; conserva advertencias conocidas por constraints condicionales no soportados por MySQL.
- Build web en servidor: aprobado, 1850 modulos.
- Nginx: configuracion valida y servicio activo.
- Gunicorn/MediCore: servicio activo y sin errores posteriores al despliegue.
- HTTPS login: 200.
- API sin autenticar: 401, proteccion correcta.
- Factura controlada de certificacion: creada con dos pagos separados.
- Reintento del primer pago: retorno el mismo ID y no duplico el monto.
- Estado final: `pagada`, saldo `0.00`.
- PDF de factura, recibo interno y recibo del paciente: 200.
- Intento de Clinica B sobre factura de Clinica A: 404.
- Caja demo: apertura, movimiento idempotente y cierre exacto aprobados; esperado `11.00`, diferencia `0.00`.
- Factura fiscal demo: emision y PDF aprobados.
- Nota de credito demo: rango ficticio marcado no valido ante SAR, anulacion fiscal y PDF aprobados.

### Hallazgos no bloqueantes

- `npm audit` reporta 7 vulnerabilidades de severidad alta. No se ejecuto `--force`; requiere revision separada de compatibilidad.
- Nginx recibio escaneos externos buscando `.env` y credenciales; los archivos no existian y no hubo exposicion. Se recomienda agregar reglas explicitas de denegacion para archivos ocultos bajo aliases de `static` y `media`.
- MySQL no implementa varios constraints condicionales historicos. Las reglas del Sprint 1.4 usan constraints normales y validacion transaccional; la deuda general debe revisarse por modelo.
- El bundle web mantiene una advertencia de tamano superior a 500 kB.

### Android fisico

Pendiente de confirmacion manual en dispositivo. TypeScript y Expo Doctor estan aprobados, pero la certificacion fisica requiere que el usuario confirme login, caja, pago parcial, pago final, recibo, movimiento, cierre, timeout, doble toque y perdida de red.
