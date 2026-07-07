# Checklist de pruebas fiscales

Fecha: 2026-07-07

## Backend

- [x] `python manage.py check`
- [x] `python manage.py test apps.billing`
- [x] No emitir si no hay perfil fiscal.
- [x] Readiness reporta `missing_profile`.
- [x] Readiness reporta `missing_range`.
- [x] Readiness reporta `ready`.
- [x] No emitir si no hay rango activo.
- [x] No emitir con rango vencido.
- [x] No emitir con rango agotado.
- [x] Emitir correctamente con rango activo.
- [x] No emitir dos veces la misma factura.
- [x] No emitir factura de otra clinica.
- [x] PDF fiscal no descarga si factura no esta emitida.
- [x] PDF fiscal descarga factura emitida.
- [x] PDF fiscal no cruza clinicas.
- [x] Anulacion fiscal no reutiliza numero.
- [x] No anular factura no fiscal desde endpoint fiscal.
- [x] No anular factura fiscal sin motivo.
- [x] No anular factura ya anulada.
- [x] No anular factura de otra clinica.
- [x] No anular sin permiso.
- [x] No generar nota de credito si no hay rango activo.
- [x] No generar nota de credito si rango vencido.
- [x] No generar nota de credito si rango agotado.
- [x] Generar nota de credito correctamente.
- [x] Mantener numero fiscal y CAI original.
- [x] No borrar pagos.
- [x] PDF nota de credito requiere permiso.
- [x] PDF nota de credito no cruza clinicas.

## Web

- [x] `npm run build`
- [x] Perfil fiscal visible en `/clinic/settings/fiscal`.
- [x] Rangos CAI visibles en `/clinic/settings/fiscal`.
- [x] Detalle de factura consulta readiness antes de emitir.
- [x] Mensaje claro si la clinica no esta lista.
- [x] Detalle de factura anula fiscalmente con motivo obligatorio.
- [x] Listado web de notas de credito.
- [x] PDF de nota de credito desde web.

## Produccion

- [ ] Ejecutar `git pull`.
- [ ] Ejecutar migraciones si existen.
- [ ] Ejecutar `python manage.py check`.
- [ ] Ejecutar build frontend.
- [ ] Reiniciar Gunicorn/Nginx.
- [ ] Probar `/api/billing/fiscal-readiness/` con usuario de clinica.
- [ ] Probar emision fiscal real de demo.
