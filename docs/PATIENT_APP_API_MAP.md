# Mapa API App Paciente - MediCore

Fecha: 2026-06-22

## Base

La app movil usa `apiClient` con `Authorization: Bearer` desde los interceptores y `appConfig.API_BASE_URL`.

## Endpoints usados por modulo

| Modulo | Metodo | Endpoint | Servicio mobile | Estado |
|---|---|---|---|---|
| Auth login | POST | `/auth/login/` | `authService.loginService` | funcional |
| Auth me | GET | `/auth/me/` | `authService.getMeService` | funcional |
| Cambiar contrasena | POST | `/auth/change-password/` | `authService.changePasswordService` | funcional |
| Logout | POST | `/auth/logout/` | `authService.logoutService` | opcional |
| Dashboard | GET | `/patient-portal/dashboard/` | `patientDashboardService.getPatientDashboard` | funcional |
| Perfil | GET | `/patient-portal/profile/` | `patientProfileService.getPatientProfile` | funcional |
| Editar perfil | PATCH | `/patient-portal/profile/` | `patientProfileService.updatePatientProfile` | funcional |
| Citas | GET | `/patient-portal/appointments/` | `patientAppointmentsService.getPatientAppointments` | funcional |
| Detalle cita | GET | `/patient-portal/appointments/{id}/` | `getPatientAppointment` | funcional |
| Solicitar cita | POST | `/patient-portal/appointments/request/` | `requestPatientAppointment` | funcional |
| Cancelar cita | PATCH | `/patient-portal/appointments/{id}/cancel/` | `cancelPatientAppointment` | funcional |
| Especialidades | GET | `/patient-portal/specialties/` | `getPatientSpecialties` | funcional |
| Medicos | GET | `/patient-portal/doctors/` | `getPatientDoctors` | funcional |
| Disponibilidad | GET | `/patient-portal/doctors/{id}/availability/` | `getPatientDoctorAvailability` | funcional |
| Recetas | GET | `/patient-portal/prescriptions/` | `getPatientPrescriptions` | funcional |
| Detalle receta | GET | `/patient-portal/prescriptions/{id}/` | `getPatientPrescription` | funcional |
| Ordenes medicas | GET | `/patient-portal/medical-orders/` | endpoints configurado | pendiente pantalla |
| Detalle orden | GET | `/patient-portal/medical-orders/{id}/` | endpoints configurado | pendiente pantalla |
| Facturas | GET | `/patient-portal/invoices/` | `getPatientInvoices` | funcional |
| Detalle factura | GET | `/patient-portal/invoices/{id}/` | `getPatientInvoice` | funcional |
| Pagos | GET | `/patient-portal/payments/` | endpoint configurado | pendiente pantalla |
| Historial clinico | GET | `/patient-portal/medical-record-summary/` | endpoint backend existe | pendiente pantalla |
| Notificaciones | GET | `/patient-portal/notifications/` | `getPatientNotifications` | funcional |
| Conteo no leidas | GET | `/patient-portal/notifications/unread-count/` | `getPatientUnreadNotificationsCount` | funcional |
| Marcar leida | PATCH | `/notifications/{id}/mark-read/` | `markPatientNotificationRead` | funcional global |
| Clinica visible | GET | `/patient-portal/clinic-info/` | `getClinicInfo` | funcional |
| Documentos | GET | `/patient-portal/documents/` | `getPatientDocuments` | funcional |
| Detalle documento | GET | `/patient-portal/documents/{id}/` | `getPatientDocument` | funcional |
| Preview documento | GET | `/patient-portal/documents/{id}/preview/` | `openPatientDocumentUrl` | funcional |
| Download documento | GET | `/patient-portal/documents/{id}/download/` | `openPatientDocumentUrl` | funcional |

## Endpoints faltantes o recomendados

| Necesidad | Endpoint sugerido | Prioridad | Nota |
|---|---|---|---|
| Configuracion paciente aislada | `/patient-portal/settings/` | baja | Hoy se usa dashboard/clinic-info. No bloquear. |
| Marcar notificacion desde portal | `/patient-portal/notifications/{id}/mark-read/` | media | El global parece filtrar por usuario; se recomienda aislarlo. |
| PDF fiscal paciente | `/patient-portal/invoices/{id}/pdf/` | media | Evitar usar `/billing/invoices/...` desde paciente. |

