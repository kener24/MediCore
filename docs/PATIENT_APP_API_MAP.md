# Mapa API App Paciente - MediCore

Fecha: 2026-06-25

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
| Ordenes medicas | GET | `/patient-portal/medical-orders/` | `getPatientMedicalOrders` | funcional |
| Detalle orden | GET | `/patient-portal/medical-orders/{id}/` | `getPatientMedicalOrder` | funcional |
| Facturas | GET | `/patient-portal/invoices/` | `getPatientInvoices` | funcional |
| Detalle factura | GET | `/patient-portal/invoices/{id}/` | `getPatientInvoice` | funcional |
| PDF fiscal paciente | GET | `/patient-portal/invoices/{id}/fiscal-pdf/` | `getInvoiceFiscalPdf` | funcional |
| Pagos | GET | `/patient-portal/payments/` | `getPatientPayments` | funcional |
| Detalle pago | GET | `/patient-portal/payments/{id}/` | `getPatientPayment` | funcional |
| Historial clinico | GET | `/patient-portal/medical-record-summary/` | `getPatientMedicalRecordSummary` | funcional |
| Notificaciones | GET | `/patient-portal/notifications/` | `getPatientNotifications` | funcional |
| Conteo no leidas | GET | `/patient-portal/notifications/unread-count/` | `getPatientUnreadNotificationsCount` | funcional |
| Marcar leida | PATCH | `/patient-portal/notifications/{id}/mark-read/` | `markPatientNotificationRead` | funcional |
| Marcar todas leidas | POST | `/patient-portal/notifications/mark-all-read/` | `markAllPatientNotificationsRead` | funcional |
| Clinica visible | GET | `/patient-portal/clinic-info/` | `getClinicInfo` | funcional |
| Settings visibles | GET | `/patient-portal/settings/` | `getPatientPortalSettings` | funcional |
| Documentos | GET | `/patient-portal/documents/` | `getPatientDocuments` | funcional |
| Detalle documento | GET | `/patient-portal/documents/{id}/` | `getPatientDocument` | funcional |
| Preview documento | GET | `/patient-portal/documents/{id}/preview/` | `openPatientDocumentUrl` | funcional |
| Download documento | GET | `/patient-portal/documents/{id}/download/` | `openPatientDocumentUrl` | funcional |

## Notas de seguridad

Todos los endpoints nuevos del paciente viven bajo `/patient-portal/`, requieren JWT y filtran por el paciente asociado al usuario autenticado.
La app ya no usa rutas administrativas de facturacion para imprimir o consultar PDF fiscal.
