# MediCore - Auditoria de Preparacion para Produccion

Fecha de auditoria: 2026-07-07

## 1. Resumen general

MediCore es un SaaS medico multi-clinica con backend Django REST Framework, frontend web React/TypeScript y app movil Expo React Native. El codigo revisado muestra una plataforma amplia con autenticacion JWT, roles, multi-clinica, pacientes, citas, admisiones, triaje, consulta medica, expediente, recetas, ordenes medicas, facturacion, caja, inventario, compras, hospitalizacion, auditoria, notificaciones, portal de paciente y suscripciones.

La auditoria confirma que la mayoria de modulos existen con modelos, serializers, endpoints y pantallas. El estado general es avanzado, pero no debe considerarse "listo para vender sin riesgos" hasta cerrar validaciones de produccion, pruebas multi-clinica automatizadas, auditoria exhaustiva de acciones criticas, seguridad de sesiones, flujo fiscal completo y pruebas de carga.

## 2. Estado del backend

Backend ubicado en `C:\Users\perez\Desktop\SaaS\MediCore`.

Configuracion principal:

- Django REST Framework en `config/settings.py`.
- JWT configurado con Simple JWT.
- Usuario custom `accounts.User`.
- CORS configurado con `CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_CREDENTIALS` y headers adicionales como `x-session-key`.
- Apps instaladas reales: `accounts`, `clinics`, `doctors`, `patients`, `appointments`, `medical_records`, `prescriptions`, `billing`, `inventory`, `admissions`, `reports`, `audit`, `clinic_settings`, `notifications`, `purchases`, `security`, `subscriptions`, `documents`, `patient_portal`, `hospitalization`.

Modelos principales encontrados:

- Usuarios y roles: `Role`, `User`.
- Clinicas: `Clinic`.
- Pacientes: `Patient`.
- Citas: `Appointment`.
- Admisiones: `PatientVisit`.
- Expediente: `MedicalRecord`, `ClinicalConsultation`, `VitalSigns`, `ClinicalSupplyUsage`.
- Recetas y ordenes: `Diagnosis`, `Prescription`, `PrescriptionItem`, `MedicalOrder`.
- Facturacion/caja: `BillableService`, `ClinicFiscalProfile`, `FiscalDocumentRange`, `Invoice`, `InvoiceItem`, `Payment`, `CashSession`, `CashMovement`.
- Inventario/compras: `InventoryCategory`, `InventoryItem`, `InventoryLot`, `InventoryMovement`, `Supplier`, `PurchaseOrder`, `PurchaseReceipt`.
- Hospitalizacion: `HospitalRoom`, `HospitalBed`, `Hospitalization`, `HospitalBedAssignment`, `HospitalVitalSigns`, `NursingNote`, `HospitalizationEvent`, `NursingRound`, `MedicationAdministration`.
- Auditoria: `AuditLog`.
- Seguridad: `PasswordResetToken`, `EmailVerificationToken`, `LoginAttempt`, `AccountLock`, `UserSession`, `SecuritySetting`.
- Notificaciones: `Notification`, `NotificationPreference`.
- Documentos: `DocumentCategory`, `ClinicalDocument`.

Endpoints principales registrados:

- Auth/security: `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/me/`, `/api/auth/change-password/`, `/api/security/*`.
- Usuarios/clinicas: `/api/users/`, `/api/roles/`, `/api/clinics/`, `/api/clinic-admin/users/`.
- Operacion clinica: `/api/patients/`, `/api/appointments/`, `/api/admissions/visits/`, endpoints de recepcion, enfermeria y doctor.
- Expediente/consulta: `/api/medical-records/`, `/api/consultations/`, `/api/clinical-consumptions/`.
- Recetas/ordenes: `/api/diagnoses/`, `/api/prescriptions/`, `/api/medical-orders/`.
- Facturacion/caja/fiscal: `/api/billing/services/`, `/api/billing/invoices/`, `/api/billing/payments/`, `/api/billing/cash-sessions/`, `/api/billing/fiscal-profile/`, `/api/billing/fiscal-ranges/`.
- Inventario/compras: `/api/inventory/*`, `/api/purchases/*`.
- Hospitalizacion: `/api/hospitalization/*`.
- Reportes: `/api/reports/*`, exportacion Excel/PDF.
- Portal paciente: `/api/patient-portal/*`.
- Auditoria: `/api/audit/logs/`, `/api/audit/summary/`, `/api/audit/my-activity/`.

Pruebas existentes:

- Hay suites por modulo en `apps/*/tests.py`.
- Se encontraron pruebas para accounts, security, patients, appointments, admissions, medical_records, prescriptions, billing, inventory, purchases, reports, audit, notifications, hospitalization y documents.

Riesgos backend:

- La suite completa `python manage.py test` no termino dentro del timeout de auditoria de 240 segundos. Conviene ejecutar por app o en CI con mayor timeout.
- Varios endpoints usan filtros multi-clinica, pero aun se requiere matriz automatizada por rol y clinica para endpoints criticos.
- Algunos modulos tienen auditoria parcial, no necesariamente uniforme en todas las acciones.

## 3. Estado del frontend web

Frontend ubicado en `C:\Users\perez\Desktop\SaaS\MediCore\frontend`.

Tecnologia:

- React 19.
- TypeScript.
- Vite.
- React Router.
- Axios.
- React Hook Form y Zod.

Pantallas/rutas encontradas:

- Login, recuperacion, reset y verificacion de email.
- Dashboard por rol.
- Superadmin: dashboard, clinicas, usuarios, reportes, auditoria, notificaciones, settings, suscripciones.
- Admin clinica: dashboard, mi clinica, usuarios, doctores, especialidades, settings, fiscal, workflow, suscripcion.
- Operacion clinica: pacientes, admisiones, triaje, hospitalizacion, citas, calendario, expedientes, consultas, diagnosticos, recetas, ordenes, documentos.
- Facturacion: dashboard, servicios, facturas, impresion, pagos, caja, pendientes.
- Inventario: dashboard, productos, categorias, lotes, movimientos, alertas.
- Compras: proveedores, ordenes, recepciones.
- Reportes: dashboard, citas, pacientes, doctores, consultas, financiero, caja, inventario, compras.
- Doctor: dashboard, sala de espera, perfil, agenda, citas, consultas, documentos, inventario, reportes.
- Paciente web: dashboard, perfil, citas, solicitud de cita, expediente, diagnosticos, recetas, ordenes, documentos, facturas, pagos, notificaciones, configuracion.

Estado:

- Build de produccion ejecutado correctamente.
- El build advierte bundle principal grande: `assets/index-*.js` de aproximadamente 901 kB minificado. Recomendacion: code splitting por rutas.
- Hay APIs separadas por dominio en `src/api/*`.
- Se observaron rutas protegidas por rol con `ProtectedRoute` y `RoleProtectedRoute`.

Riesgos web:

- No se hizo prueba manual de cada pantalla en este sprint.
- Algunas rutas reutilizan componentes generales, por lo que pueden existir pantallas funcionales pero no totalmente especializadas.
- Se debe revisar botones y flujos de alta criticidad con pruebas E2E, especialmente fiscal, caja, hospitalizacion, inventario y consulta activa.

## 4. Estado de apps moviles

App movil ubicada en `C:\Users\perez\Desktop\SaaS\App-Mobile\Medicore`.

Tecnologia:

- Expo SDK 54.
- React Native 0.81.
- React 19.
- React Navigation.
- Axios.
- `expo-secure-store` para almacenamiento de tokens.

Roles/pantallas encontradas:

- Auth: login y rol no soportado.
- Paciente: dashboard, citas, solicitar cita, detalle, perfil, editar perfil, cambiar contrasena, historial medico, recetas, ordenes, documentos, facturas, pagos, notificaciones, informacion de clinica.
- Doctor: dashboard, sala de espera, agenda, consulta, resumen, historial, detalle de consulta, recetas, ordenes, consumo clinico, perfil, editar perfil, seguridad, notificaciones.
- Recepcion: dashboard, busqueda/creacion de pacientes, admisiones, detalle de visita, check-in, agenda, perfil, seguridad, cambio de contrasena.
- Caja: dashboard, facturas pendientes, busqueda, detalle de factura, registrar pago, historial, detalle de pago, perfil, seguridad.
- Enfermeria: dashboard, cola de triaje, detalle de paciente, signos vitales, completar triaje, triajes completados, notificaciones, perfil, seguridad.
- Hospitalizacion movil enfermeria: internados, detalle, signos hospitalarios, notas, rondas, medicamentos, pendientes, eventos y camas.
- Admin movil: dashboard/home y placeholders para usuarios/reportes.

Estado:

- `npx tsc --noEmit` paso correctamente.
- `npx expo-doctor` paso 18/18 checks.
- La app usa `SecureStore` para access token, refresh token, session key y usuario.
- Hay interceptores de auth y refresh.

Riesgos moviles:

- Admin movil todavia tiene pantallas placeholder (`RolePlaceholderScreen`) para usuarios/reportes.
- Algunas apps dependen de endpoints fallback para compatibilidad; debe consolidarse en pruebas para evitar llamadas a rutas obsoletas.
- No se hicieron pruebas manuales en dispositivos durante esta auditoria.

## 5. Estado de facturacion fiscal

Existe implementacion fiscal real en backend:

- `ClinicFiscalProfile`.
- `FiscalDocumentRange`.
- `get_next_fiscal_number()` con `select_for_update()`.
- `issue_fiscal_invoice()` con `transaction.atomic()` y bloqueo de factura/perfil/rango.
- `cancel_fiscal_invoice()`.
- Endpoints:
  - `GET/PATCH /api/billing/fiscal-profile/`.
  - CRUD de `/api/billing/fiscal-ranges/`.
  - `POST /api/billing/invoices/{id}/issue-fiscal/`.
  - `POST /api/billing/invoices/{id}/cancel-fiscal/`.
  - `GET /api/billing/invoices/{id}/fiscal-print-data/`.
  - `GET /api/billing/invoices/{id}/fiscal-pdf/`.

Controles encontrados:

- CAI requerido.
- Rango activo.
- Fecha de expiracion.
- Rango agotado.
- Correlativo atomico.
- Factura fiscal emitida no editable/borrable por via normal.
- Anulacion fiscal no reutiliza numero.
- Pruebas automatizadas para emision, doble emision, rango vencido/agotado y anulacion.

Faltante/riesgo:

- El modelo contempla `credit_note`, pero no se encontro flujo completo de nota de credito fiscal.
- Debe validarse formato final con contador/SAR antes de produccion real.
- Debe revisarse si PDF fiscal cumple todos los campos legales y reglas de representacion impresa.

## 6. Estado de caja

Existe caja real:

- `CashSession` con apertura, cierre, monto inicial, esperado, cierre y diferencia.
- `Payment` con metodos: efectivo, tarjeta, transferencia, deposito, cheque, otro.
- `CashMovement` para ingresos/egresos manuales.
- Endpoints de abrir caja, caja actual, cerrar caja y movimientos.
- Pagos parciales soportados por `paid_amount` y `balance_due`.
- Anulacion de pagos recalcula factura.

Riesgos:

- Pagos mixtos en una sola operacion no aparecen como entidad compuesta; se pueden registrar varios pagos por factura, pero se debe definir UX/API para "pago mixto" atomico.
- Cierre de caja existe, pero se debe validar si cubre cuadre por metodo, diferencias justificadas y reporte operacional final.
- Cuentas por cobrar existen por `balance_due`, pero falta flujo dedicado de cobranza, vencimientos y seguimiento.

## 7. Estado de inventario

Existe inventario real:

- Categorias, productos, lotes y movimientos.
- Stock actual/minimo/maximo.
- Lotes con vencimiento.
- Movimientos de entrada, salida y ajuste.
- Alertas de stock bajo, vencidos y por vencer.
- Auditoria de movimientos.
- Consumo clinico (`ClinicalSupplyUsage`) descuenta inventario con `select_for_update()`.
- Compras/recepciones suben inventario y crean movimiento.

Riesgos:

- Medicacion hospitalaria no evidencia descuento automatico de inventario al administrar medicamento.
- Falta matriz de consumo receta/enfermeria/inventario.
- Alertas existen, pero se debe confirmar ejecucion programada en produccion.

## 8. Estado de expediente clinico

Existe expediente:

- `MedicalRecord` con alergias, enfermedades cronicas, antecedentes, medicamentos actuales y notas.
- `ClinicalConsultation` con motivo, sintomas, examen, evaluacion, diagnostico preliminar, plan y recomendaciones.
- `VitalSigns`.
- `ClinicalSupplyUsage`.
- Endpoints para consultas, signos, diagnosticos, recetas, ordenes y consumos relacionados.

Estado funcional:

- El medico puede iniciar consulta desde cita/admisiones.
- Hay endpoints relacionados desde consulta activa: signos, diagnosticos, recetas, ordenes y consumos.

Riesgos:

- Falta validar a fondo si en la consulta activa web/movil se ve todo el historial necesario de forma integrada.
- No se encontro validacion clinica avanzada de alergias contra receta ni dosis por peso.

## 9. Estado de recetas

Existe modulo:

- `Prescription`.
- `PrescriptionItem`.
- Emision y anulacion.
- No emitir receta sin medicamentos.
- Receta emitida no editable segun pruebas.
- Portal paciente puede ver recetas propias.

Riesgos:

- Falta validacion clinica contra alergias, interacciones o duplicados.
- Falta flujo de dispensacion conectado a inventario si se requiere.

## 10. Estado de ordenes medicas

Existe modulo:

- `MedicalOrder`.
- Estados y acciones `complete`, `cancel`, `my_orders`.
- Documentos asociados via `MedicalOrderDocumentsView`.
- Paciente puede ver ordenes desde portal.

Riesgos:

- El modelo base no muestra campos de responsable de ejecucion, fecha de ejecucion, resultado estructurado o evidencia clinica completa.
- Falta flujo operacional completo: asignar responsable, registrar resultado, adjuntar evidencia y notificar.

## 11. Estado de hospitalizacion

Existe modulo avanzado:

- Habitaciones y camas.
- Internamientos.
- Asignacion/cambio/liberacion de cama.
- Alta y cancelacion.
- Signos hospitalarios.
- Notas de enfermeria.
- Eventos.
- Rondas.
- Administracion de medicamentos con acciones administrar/omitir/retrasar.
- Dashboard hospitalario.
- Pruebas de permisos y bloqueo de acciones cerradas.

Riesgos:

- No se encontro evolucion medica diaria como entidad dedicada.
- No se encontro plan de tratamiento activo/indicaciones medicas estructuradas para hospitalizacion.
- Resumen de alta existe como notas/motivo, pero no como documento clinico completo.
- Facturacion de hospitalizacion debe validarse de extremo a extremo.

## 12. Estado de auditoria

Existe `AuditLog` con:

- Clinica.
- Usuario, email, rol.
- Accion/modulo.
- Objeto.
- Descripcion.
- Before/after/changes.
- Estado/severidad.
- IP, user-agent, metodo y path.
- Metadata.

Acciones auditadas encontradas:

- Login exitoso/fallido.
- Cambio de contrasena.
- Usuarios: crear, actualizar, activar, desactivar.
- Pacientes: crear, actualizar, activar, desactivar.
- Citas: crear, cancelar, confirmar, atendida, no asistio, reprogramar.
- Admisiones: crear, check-in, enviar a triaje, enviar a medico, cancelar, generar factura.
- Signos vitales.
- Consulta/finalizacion/consumos.
- Facturas, pagos, fiscal, reportes.
- Inventario y compras.
- Documentos.
- Hospitalizacion y medicacion.

Riesgos:

- Auditoria es amplia pero no uniforme en todos los ViewSets; algunos `audit_in_class` son falsos y dependen de servicios internos.
- Se debe preparar checklist de acciones criticas por modulo para cerrar brechas.

## 13. Estado de seguridad multi-clinica

Se encontro filtrado por clinica en muchos `get_queryset()` y serializers:

- Usuarios admin por `clinica_id`.
- Pacientes por `clinic_id`.
- Citas por clinica/doctor/paciente.
- Admisiones por clinica.
- Expediente/consultas por clinica.
- Facturacion, inventario, compras, documentos, hospitalizacion y reportes con scoping.

Riesgos:

- La seguridad multi-clinica debe probarse endpoint por endpoint con dos clinicas y varios roles.
- Endpoints criticos para pruebas: pacientes, citas, admisiones, consultas, facturas, pagos, inventario, compras, hospitalizacion, documentos, reportes, portal paciente, audit logs.
- Superadmin tiene accesos globales en algunos modulos, pero en datos clinicos sensibles se debe confirmar politica exacta.

## 14. Estado de sesiones

Existe modulo `security`:

- Reset de contrasena.
- Verificacion de email.
- Intentos de login.
- Bloqueos de cuenta.
- Sesiones de usuario.
- Revocar sesion propia.
- Revocar todas.
- Admin sessions.
- Politica de contrasena.
- Configuracion de seguridad por clinica.

Movil:

- Usa `SecureStore` para tokens.
- Tiene interceptor de refresh.

Riesgos:

- No se confirmo cierre por inactividad en web/movil.
- No se confirmo control de sesiones concurrentes por politica.
- Debe revisarse logout global y revocacion real de refresh tokens en todos los clientes.

## 15. Estado de citas y recordatorios

Citas:

- Estados: confirmacion, cancelacion, atendida, no asistio, reprogramacion.
- Disponibilidad de doctor.
- Portal paciente solicita cita.
- Check-in crea visita operativa.

Recordatorios:

- Existen notificaciones y comando/endpoints de recordatorios: `generate_appointment_reminders`.
- Preferencias de notificacion incluyen email/SMS/WhatsApp/push como flags.

Riesgos:

- No se confirmo servicio externo de push/email/SMS activo.
- Falta probar recordatorio 24h en entorno real o job programado.
- Lista de espera no fue encontrada como flujo dedicado.

## 16. Estado de reportes

Reportes backend:

- Dashboard clinica.
- Dashboard superadmin.
- Citas.
- Pacientes.
- Doctores.
- Consultas.
- Financiero.
- Caja.
- Inventario.
- Compras.
- Doctor dashboard.
- Recepcion dashboard.
- Exportacion Excel/PDF.

Reportes web:

- Pantallas para los reportes anteriores.

Riesgos:

- Faltan reportes operativos avanzados confirmados: tiempo promedio por etapa, tasa de ausentismo, ingresos por medico, productos mas consumidos, dias de mayor demanda, cuentas por cobrar detalladas, ocupacion hospitalaria avanzada.
- Exportaciones existen, pero deben verificarse con filtros y permisos por rol.

## 17. Riesgos antes de produccion

Prioridad alta:

- Ejecutar suite de pruebas completa sin timeout.
- Probar multi-clinica de forma automatizada en endpoints criticos.
- Cerrar nota de credito fiscal.
- Validar fiscal Honduras con contador/SAR.
- Asegurar auditoria de todas las acciones criticas.
- Cerrar caja con pagos mixtos/cuentas por cobrar/cierre por metodo.
- Validar sesiones, inactividad y revocacion global.

Prioridad media:

- Code splitting web.
- Pruebas E2E web/movil.
- Alertas programadas en produccion.
- Reportes operativos avanzados.
- Hospitalizacion medica completa.

## 18. Prioridad de correcciones

1. Fiscal/nota de credito/anulaciones.
2. Auditoria real de acciones criticas.
3. Seguridad multi-clinica automatizada.
4. Cuentas por cobrar/pagos mixtos.
5. Cierre de caja.
6. Inventario automatico por consumo.
7. Compras/lotes/alertas.
8. Expediente integrado en consulta.
9. Validaciones clinicas.
10. Ordenes medicas completas.
11. Hospitalizacion completa.
12. Sesiones/inactividad.
13. Recordatorios.
14. Reportes.
15. Carga.

## 19. Proximos sprints

Ver `docs/PRODUCTION_ROADMAP.md`.

## Resultado de comandos

Backend:

- `..\venv\Scripts\python.exe manage.py check`: exitoso. Resultado: `System check identified no issues (0 silenced).`
- `..\venv\Scripts\python.exe manage.py test`: no concluyo dentro de 240 segundos durante esta auditoria. No se modifico codigo para forzar el resultado.

Frontend web:

- `npm install`: exitoso. Reporto 1 vulnerabilidad alta en auditoria npm.
- `npm run build`: exitoso. Advertencia: chunk principal mayor a 500 kB.

Movil:

- `npm install`: exitoso. Reporto 16 vulnerabilidades npm, 15 moderadas y 1 alta.
- `npx tsc --noEmit`: exitoso.
- `npx expo-doctor`: exitoso, 18/18 checks.

