# MediCore - Roadmap de Implementacion para Produccion

Fecha: 2026-07-07

Este roadmap se basa en la auditoria real del codigo actual. La regla general para todos los sprints es no duplicar modulos, no cambiar rutas/modelos sin necesidad y mantener compatibilidad con `http://kp-software.tech/api/` y luego `https://kp-software.tech/api/`.

## Sprint 1A - Cierre fiscal base

- Objetivo: dejar funcional la base fiscal Honduras para uso controlado.
- Modulos tocados: billing, fiscal profile, fiscal ranges, invoice, PDF fiscal, reportes fiscales.
- Backend: validar perfil fiscal, CAI, rango autorizado, fecha limite, correlativo, permisos, multi-clinica, PDF y auditoria.
- Web: acciones para emitir/anular fiscal, estados claros, readiness fiscal y mensajes de error controlados.
- Movil: solo lectura/visualizacion si aplica para paciente/caja; no crear flujo fiscal complejo inicialmente.
- Pruebas: perfil faltante, CAI/rango faltante, rango vencido, rango agotado, correlativo unico, multi-clinica, anulacion, PDF.
- Despliegue: migraciones y seed demo separados de produccion.
- Riesgo: alto, requiere validacion con contador/SAR.

## Sprint 1B - Nota de credito fiscal

- Objetivo: implementar nota de credito fiscal real cuando el flujo sea validado por contador.
- Modulos tocados: billing, PDF fiscal, reportes fiscales y auditoria.
- Backend: relacion con factura original, rango CAI de nota de credito, emision segura, no reutilizar correlativos.
- Web: accion de nota de credito, confirmaciones, PDF y estados claros.
- Pruebas: nota de credito parcial/total, factura original, rango vencido, rango agotado y auditoria.
- Riesgo: alto legal/fiscal; no iniciar sin validacion de contador.

## Sprint 2 - Auditoria real de acciones criticas

- Objetivo: asegurar trazabilidad completa.
- Modulos tocados: audit, accounts, patients, appointments, admissions, medical_records, prescriptions, billing, inventory, purchases, hospitalization, documents.
- Backend: checklist de acciones criticas y cobertura de `AuditLog` con before/after, IP, user-agent, clinica y usuario.
- Web: visor de auditoria con filtros utiles.
- Movil: no exponer auditoria completa; registrar acciones via backend.
- Pruebas: crear/editar/anular/ver datos sensibles por modulo.
- Despliegue: sin migraciones grandes salvo campos faltantes.
- Riesgo: medio-alto por datos sensibles.

## Sprint 3 - Seguridad multi-clinica y pruebas automaticas

- Objetivo: evitar datos cruzados entre clinicas.
- Modulos tocados: todos los endpoints con datos por clinica.
- Backend: pruebas automatizadas con dos clinicas por pacientes, citas, admisiones, consultas, facturas, pagos, inventario, compras, hospitalizacion, documentos, reportes.
- Web: validar que filtros de clinica no permitan saltarse permisos.
- Movil: validar que cada rol solo ve su clinica/paciente.
- Pruebas: matriz rol x clinica x endpoint.
- Despliegue: sin cambios funcionales grandes, preferir tests primero.
- Riesgo: alto.

## Sprint 4 - Cuentas por cobrar y pagos mixtos

- Objetivo: convertir saldo pendiente en flujo operativo real.
- Modulos tocados: billing, payments, cashier, reports.
- Backend: entidad o flujo de pago mixto atomico, estado de saldo, vencimientos, seguimiento.
- Web: pantalla de cuentas por cobrar, pagos parciales/mixtos, historial.
- Movil: caja con pago parcial y pago mixto simple.
- Pruebas: pago parcial, mixto, anulacion, saldo vencido, permisos.
- Despliegue: migracion si se crea agrupador de pagos.
- Riesgo: alto financiero.

## Sprint 5 - Cierre de caja con cuadre real

- Objetivo: cierre auditable por metodo y diferencias justificadas.
- Modulos tocados: cash sessions, payments, reports.
- Backend: totales por metodo, diferencia obligatoriamente justificada, cierre irreversible o re-apertura controlada.
- Web: cierre de caja profesional, resumen imprimible/PDF.
- Movil: caja puede consultar y cerrar si el rol aplica.
- Pruebas: caja abierta/cerrada, movimientos, diferencias, anulaciones.
- Despliegue: bajo-medio.
- Riesgo: alto financiero.

## Sprint 6 - Inventario automatico por consumo clinico

- Objetivo: asegurar stock real por consulta, receta y enfermeria.
- Modulos tocados: inventory, medical_records, prescriptions, hospitalization.
- Backend: definir eventos que descuentan stock, rollback/anulacion, lotes y vencimientos.
- Web: selector de lotes y alerta de stock antes de confirmar.
- Movil: doctor/enfermeria con consumo seguro.
- Pruebas: sin stock, lote vencido, anulacion, consumo duplicado.
- Despliegue: medio.
- Riesgo: alto operativo.

## Sprint 7 - Compras, lotes y alertas de stock

- Objetivo: cerrar abastecimiento.
- Modulos tocados: purchases, inventory, notifications, reports.
- Backend: alertas programadas, recepcion parcial/total, vencimientos.
- Web: panel de compras, recepcion, historial por producto/proveedor.
- Movil: solo consulta de alertas inicialmente.
- Pruebas: recibir compra, lote requerido, vencimiento requerido, stock minimo.
- Despliegue: programar jobs/cron si aplica.
- Riesgo: medio.

## Sprint 8 - Expediente integrado en consulta activa

- Objetivo: que el medico consulte historial sin salir de la consulta.
- Modulos tocados: medical_records, consultations, prescriptions, documents.
- Backend: endpoint de contexto clinico resumido.
- Web: panel lateral o secciones dentro de consulta activa.
- Movil: resumen clinico, ultimas consultas, alergias, cronicos, documentos.
- Pruebas: permisos, datos propios del paciente, rendimiento.
- Despliegue: bajo-medio.
- Riesgo: medio clinico.

## Sprint 9 - Validaciones clinicas basicas

- Objetivo: reducir errores clinicos comunes.
- Modulos tocados: consultas, signos, recetas, ordenes, enfermeria.
- Backend: rangos vitales, alergias contra medicamentos, dosis por peso si aplica, requeridos por tipo.
- Web: mensajes claros y confirmaciones.
- Movil: validaciones antes de enviar.
- Pruebas: rangos invalidos, alergia, medicamento duplicado.
- Despliegue: medio.
- Riesgo: alto clinico.

## Sprint 10 - Seguimiento completo de ordenes medicas

- Objetivo: que las ordenes no solo se creen, sino que se ejecuten y cierren.
- Modulos tocados: prescriptions/medical_orders, documents, notifications, patient portal.
- Backend: responsable, fecha de ejecucion, resultado, evidencia, estados.
- Web: bandeja de ordenes por estado/responsable.
- Movil: doctor ve seguimiento; paciente ve ordenes permitidas.
- Pruebas: crear, asignar, completar, cancelar, adjuntar resultado.
- Despliegue: migracion probable.
- Riesgo: medio-alto.

## Sprint 11 - Hospitalizacion medica completa

- Objetivo: llevar hospitalizacion mas alla de enfermeria/camas.
- Modulos tocados: hospitalization, medical_records, billing.
- Backend: evolucion medica diaria, plan activo, indicaciones, resumen de alta, facturacion relacionada.
- Web: pantalla integral de internamiento.
- Movil: enfermeria ve indicaciones; doctor evoluciona paciente.
- Pruebas: alta, cama, medicamentos, evolucion, facturacion.
- Despliegue: alto.
- Riesgo: alto clinico/operativo.

## Sprint 12 - Seguridad de sesiones e inactividad

- Objetivo: endurecer sesiones en web y movil.
- Modulos tocados: security, auth, frontend web, app movil.
- Backend: politicas por clinica, revocacion real, control concurrente si aplica.
- Web: cierre por inactividad, renovacion segura.
- Movil: manejo de refresh, logout global, bloqueo por inactividad si aplica.
- Pruebas: token vencido, refresh revocado, sesion multiple.
- Despliegue: medio.
- Riesgo: alto seguridad.

## Sprint 13 - Recordatorios de citas por notificacion

- Objetivo: automatizar recordatorios reales.
- Modulos tocados: appointments, notifications, patient portal, movil.
- Backend: job 24h, preferencias, templates.
- Web: configuracion y log de envios.
- Movil: notificaciones in-app y preparacion para push.
- Pruebas: cita futura, cancelada, confirmada, no duplicar recordatorio.
- Despliegue: requiere cron/celery o scheduler.
- Riesgo: medio.

## Sprint 14 - Reportes operativos

- Objetivo: reportes utiles para administrar clinicas.
- Modulos tocados: reports, billing, appointments, inventory, hospitalization.
- Backend: metricas de espera, ausentismo, ingresos por medico, productos consumidos, demanda, CxC, ocupacion.
- Web: filtros, graficas, exportacion.
- Movil: dashboard resumido por rol si aplica.
- Pruebas: filtros, permisos, exportaciones.
- Despliegue: bajo-medio.
- Riesgo: medio.

## Sprint 15 - Prueba de carga minima

- Objetivo: validar capacidad antes de venta.
- Modulos tocados: backend, web, base de datos, servidor.
- Backend: escenarios con login, pacientes, citas, consulta, facturacion, reportes.
- Web: build optimizado y cache.
- Movil: smoke test contra produccion.
- Pruebas: carga concurrente, tiempos de respuesta, errores 5xx, DB indexes.
- Despliegue: monitoreo, logs y rollback.
- Riesgo: alto si no se ejecuta antes de clientes reales.
