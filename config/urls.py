from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    ChangePasswordView,
    ClinicAdminDashboardView,
    ClinicAdminUserViewSet,
    LoginView,
    MeView,
    MyClinicView,
    RoleViewSet,
    SuperAdminDashboardView,
    UserViewSet,
)
from apps.admissions.views import PatientVisitViewSet
from apps.clinics.views import ClinicViewSet
from apps.doctors.views import DoctorDashboardView, DoctorProfileViewSet, SpecialtyViewSet
from apps.patients.views import PatientViewSet
from apps.appointments.views import AppointmentViewSet
from apps.medical_records.views import ClinicalConsultationViewSet, ClinicalSupplyUsageViewSet, MedicalRecordViewSet
from apps.prescriptions.views import DiagnosisViewSet, MedicalOrderViewSet, PrescriptionViewSet
from apps.billing.views import BillableServiceViewSet, BillingStatsViewSet, CashSessionViewSet, ClinicFiscalProfileViewSet, FiscalDocumentRangeViewSet, InvoiceViewSet, PaymentViewSet
from apps.inventory.views import InventoryAlertViewSet, InventoryCategoryViewSet, InventoryItemViewSet, InventoryLotViewSet, InventoryMovementViewSet, InventoryStatsViewSet
from apps.purchases.views import PurchaseItemHistoryViewSet, PurchaseOrderViewSet, PurchaseReceiptViewSet, PurchaseStatsViewSet, SupplierViewSet
from apps.reports.views import (
    AppointmentsReportView,
    CashReportView,
    ClinicDashboardReportView,
    ConsultationsReportView,
    DoctorDashboardReportView,
    DoctorsReportView,
    FinancialReportView,
    InventoryReportView,
    PatientsReportView,
    PurchasesReportView,
    ReceptionDashboardReportView,
    ReportExcelExportView,
    ReportPdfExportView,
    SuperAdminDashboardReportView,
)
from apps.audit.views import AuditLogViewSet, AuditStatsViewSet
from apps.notifications.views import GenerateAppointmentRemindersView, GenerateBillingAlertsView, GenerateInventoryAlertsView, NotificationPreferenceView, NotificationStatsView, NotificationViewSet
from apps.clinic_settings.views import ClinicSettingsByClinicView, ClinicSettingsSummaryView, MyClinicSettingsView, PublicClinicSettingsView
from apps.subscriptions.views import ClinicPlanUsageView, ClinicSubscriptionActionView, ClinicSubscriptionDetailView, ClinicSubscriptionsView, MyPlanUsageView, MySubscriptionView, SubscriptionFeaturesView, SubscriptionPlanViewSet
from apps.documents.views import (
    AppointmentDocumentsView,
    ClinicalDocumentViewSet,
    ConsultationDocumentsView,
    DocumentCategoryViewSet,
    MedicalOrderDocumentsView,
    MedicalRecordDocumentsView,
    PatientDocumentsView,
    PatientPortalDocumentFileView,
    PatientPortalDocumentsView,
)
from apps.patient_portal.views import (
    PatientPortalAppointmentCancelView,
    PatientPortalAppointmentRequestView,
    PatientPortalAppointmentsView,
    PatientPortalClinicInfoView,
    PatientPortalDashboardView,
    PatientPortalDoctorAvailabilityView,
    PatientPortalDoctorsView,
    PatientPortalInvoicesView,
    PatientPortalMedicalOrdersView,
    PatientPortalMedicalRecordSummaryView,
    PatientPortalNotificationsView,
    PatientPortalPaymentsView,
    PatientPortalPrescriptionsView,
    PatientPortalProfileView,
    PatientPortalSpecialtiesView,
    PatientPortalUnreadNotificationsView,
)
from apps.security.views import (
    AccountLocksView,
    AccountLockStatusView,
    AccountLockUnlockView,
    AdminSessionRevokeView,
    AdminSessionsView,
    EmailVerificationConfirmView,
    EmailVerificationSendView,
    EmailVerificationStatusView,
    PasswordPolicyValidateView,
    PasswordPolicyView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    SecuritySettingsView,
    UserSessionRevokeView,
    UserSessionsRevokeAllView,
    UserSessionsView,
)


router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("roles", RoleViewSet, basename="roles")
router.register("clinics", ClinicViewSet, basename="clinics")
router.register("clinic-admin/users", ClinicAdminUserViewSet, basename="clinic-admin-users")
router.register("specialties", SpecialtyViewSet, basename="specialties")
router.register("doctors", DoctorProfileViewSet, basename="doctors")
router.register("patients", PatientViewSet, basename="patients")
router.register("appointments", AppointmentViewSet, basename="appointments")
router.register("admissions/visits", PatientVisitViewSet, basename="admissions-visits")
router.register("medical-records", MedicalRecordViewSet, basename="medical-records")
router.register("consultations", ClinicalConsultationViewSet, basename="consultations")
router.register("clinical-consumptions", ClinicalSupplyUsageViewSet, basename="clinical-consumptions")
router.register("diagnoses", DiagnosisViewSet, basename="diagnoses")
router.register("prescriptions", PrescriptionViewSet, basename="prescriptions")
router.register("medical-orders", MedicalOrderViewSet, basename="medical-orders")
router.register("billing/services", BillableServiceViewSet, basename="billing-services")
router.register("billing/fiscal-ranges", FiscalDocumentRangeViewSet, basename="billing-fiscal-ranges")
router.register("billing/invoices", InvoiceViewSet, basename="billing-invoices")
router.register("billing/payments", PaymentViewSet, basename="billing-payments")
router.register("billing/cash-sessions", CashSessionViewSet, basename="billing-cash-sessions")
router.register("billing/stats", BillingStatsViewSet, basename="billing-stats")
router.register("inventory/categories", InventoryCategoryViewSet, basename="inventory-categories")
router.register("inventory/items", InventoryItemViewSet, basename="inventory-items")
router.register("inventory/lots", InventoryLotViewSet, basename="inventory-lots")
router.register("inventory/movements", InventoryMovementViewSet, basename="inventory-movements")
router.register("inventory/stats", InventoryStatsViewSet, basename="inventory-stats")
router.register("purchases/suppliers", SupplierViewSet, basename="purchase-suppliers")
router.register("purchases/orders", PurchaseOrderViewSet, basename="purchase-orders")
router.register("purchases/receipts", PurchaseReceiptViewSet, basename="purchase-receipts")
router.register("purchases/stats", PurchaseStatsViewSet, basename="purchase-stats")
router.register("audit/logs", AuditLogViewSet, basename="audit-logs")
router.register("audit/stats", AuditStatsViewSet, basename="audit-stats")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("subscriptions/plans", SubscriptionPlanViewSet, basename="subscription-plans")
router.register("documents/categories", DocumentCategoryViewSet, basename="document-categories")
router.register("documents", ClinicalDocumentViewSet, basename="documents")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", LoginView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="auth_me"),
    path("api/auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("api/security/password-reset/request/", PasswordResetRequestView.as_view(), name="security-password-reset-request"),
    path("api/security/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="security-password-reset-confirm"),
    path("api/security/email-verification/send/", EmailVerificationSendView.as_view(), name="security-email-verification-send"),
    path("api/security/email-verification/confirm/", EmailVerificationConfirmView.as_view(), name="security-email-verification-confirm"),
    path("api/security/email-verification/status/", EmailVerificationStatusView.as_view(), name="security-email-verification-status"),
    path("api/security/account-lock/status/", AccountLockStatusView.as_view(), name="security-account-lock-status"),
    path("api/security/account-locks/", AccountLocksView.as_view(), name="security-account-locks"),
    path("api/security/account-locks/<int:lock_id>/unlock/", AccountLockUnlockView.as_view(), name="security-account-lock-unlock"),
    path("api/security/sessions/", UserSessionsView.as_view(), name="security-sessions"),
    path("api/security/sessions/<int:session_id>/revoke/", UserSessionRevokeView.as_view(), name="security-session-revoke"),
    path("api/security/sessions/revoke-all/", UserSessionsRevokeAllView.as_view(), name="security-sessions-revoke-all"),
    path("api/security/admin/sessions/", AdminSessionsView.as_view(), name="security-admin-sessions"),
    path("api/security/admin/sessions/<int:session_id>/revoke/", AdminSessionRevokeView.as_view(), name="security-admin-session-revoke"),
    path("api/security/password-policy/", PasswordPolicyView.as_view(), name="security-password-policy"),
    path("api/security/password-policy/validate/", PasswordPolicyValidateView.as_view(), name="security-password-policy-validate"),
    path("api/security/settings/", SecuritySettingsView.as_view(), name="security-settings"),
    path("api/admin/dashboard/", SuperAdminDashboardView.as_view(), name="superadmin_dashboard"),
    path("api/clinic-admin/dashboard/", ClinicAdminDashboardView.as_view(), name="clinic_admin_dashboard"),
    path("api/clinic-admin/my-clinic/", MyClinicView.as_view(), name="clinic_admin_my_clinic"),
    path("api/doctor/dashboard/", DoctorDashboardView.as_view(), name="doctor_dashboard"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger_ui"),
    path("api/inventory/alerts/low-stock/", InventoryAlertViewSet.as_view({"get": "low_stock"}), name="inventory-low-stock"),
    path("api/admissions/register-walk-in/", PatientVisitViewSet.as_view({"post": "register_walk_in"}), name="admissions-register-walk-in"),
    path("api/admissions/check-in-appointment/", PatientVisitViewSet.as_view({"post": "check_in_appointment"}), name="admissions-check-in-appointment"),
    path("api/admissions/triage-queue/", PatientVisitViewSet.as_view({"get": "triage_queue"}), name="admissions-triage-queue"),
    path("api/admissions/doctor-waiting-room/", PatientVisitViewSet.as_view({"get": "doctor_waiting_room"}), name="admissions-doctor-waiting-room"),
    path("api/admissions/stats/today/", PatientVisitViewSet.as_view({"get": "stats_today"}), name="admissions-stats-today"),
    path("api/billing/pending-visits/", PatientVisitViewSet.as_view({"get": "pending_billing"}), name="billing-pending-visits"),
    path("api/billing/fiscal-profile/", ClinicFiscalProfileViewSet.as_view({"get": "list", "patch": "partial_update"}), name="billing-fiscal-profile"),
    path("api/billing/visits/<int:pk>/generate-invoice/", PatientVisitViewSet.as_view({"post": "generate_invoice"}), name="billing-generate-invoice-from-visit"),
    path("api/billing/pending-consumptions/", InvoiceViewSet.as_view({"get": "pending_consumptions"}), name="billing-pending-consumptions"),
    path("api/inventory/alerts/expiring-soon/", InventoryAlertViewSet.as_view({"get": "expiring_soon"}), name="inventory-expiring-soon"),
    path("api/inventory/alerts/expired/", InventoryAlertViewSet.as_view({"get": "expired"}), name="inventory-expired"),
    path("api/purchases/items/<int:pk>/history/", PurchaseItemHistoryViewSet.as_view({"get": "retrieve"}), name="purchase-item-history"),
    path("api/reports/clinic-dashboard/", ClinicDashboardReportView.as_view(), name="reports-clinic-dashboard"),
    path("api/reports/superadmin-dashboard/", SuperAdminDashboardReportView.as_view(), name="reports-superadmin-dashboard"),
    path("api/reports/appointments/", AppointmentsReportView.as_view(), name="reports-appointments"),
    path("api/reports/patients/", PatientsReportView.as_view(), name="reports-patients"),
    path("api/reports/doctors/", DoctorsReportView.as_view(), name="reports-doctors"),
    path("api/reports/consultations/", ConsultationsReportView.as_view(), name="reports-consultations"),
    path("api/reports/financial/", FinancialReportView.as_view(), name="reports-financial"),
    path("api/reports/cash/", CashReportView.as_view(), name="reports-cash"),
    path("api/reports/inventory/", InventoryReportView.as_view(), name="reports-inventory"),
    path("api/reports/purchases/", PurchasesReportView.as_view(), name="reports-purchases"),
    path("api/reports/doctor-dashboard/", DoctorDashboardReportView.as_view(), name="reports-doctor-dashboard"),
    path("api/reports/reception-dashboard/", ReceptionDashboardReportView.as_view(), name="reports-reception-dashboard"),
    path("api/reports/<str:report>/export-excel/", ReportExcelExportView.as_view(), name="reports-export-excel"),
    path("api/reports/<str:report>/export-pdf/", ReportPdfExportView.as_view(), name="reports-export-pdf"),
    path("api/clinic-settings/my-settings/", MyClinicSettingsView.as_view(), name="clinic-settings-my"),
    path("api/clinic-settings/clinics/<int:clinic_id>/", ClinicSettingsByClinicView.as_view(), name="clinic-settings-clinic"),
    path("api/clinic-settings/public/<int:clinic_id>/", PublicClinicSettingsView.as_view(), name="clinic-settings-public"),
    path("api/clinic-settings/summary/", ClinicSettingsSummaryView.as_view(), name="clinic-settings-summary"),
    path("api/subscriptions/my-subscription/", MySubscriptionView.as_view(), name="subscriptions-my"),
    path("api/subscriptions/usage/", MyPlanUsageView.as_view(), name="subscriptions-usage"),
    path("api/subscriptions/features/", SubscriptionFeaturesView.as_view(), name="subscriptions-features"),
    path("api/subscriptions/clinics/", ClinicSubscriptionsView.as_view(), name="subscriptions-clinics"),
    path("api/subscriptions/clinics/<int:clinic_id>/", ClinicSubscriptionDetailView.as_view(), name="subscriptions-clinic-detail"),
    path("api/subscriptions/clinics/<int:clinic_id>/usage/", ClinicPlanUsageView.as_view(), name="subscriptions-clinic-usage"),
    path("api/subscriptions/clinics/<int:clinic_id>/<str:action_name>/", ClinicSubscriptionActionView.as_view(), name="subscriptions-clinic-action"),
    path("api/patient-portal/dashboard/", PatientPortalDashboardView.as_view(), name="patient-portal-dashboard"),
    path("api/patient-portal/profile/", PatientPortalProfileView.as_view(), name="patient-portal-profile"),
    path("api/patient-portal/appointments/", PatientPortalAppointmentsView.as_view(), name="patient-portal-appointments"),
    path("api/patient-portal/appointments/<int:appointment_id>/", PatientPortalAppointmentsView.as_view(), name="patient-portal-appointment-detail"),
    path("api/patient-portal/appointments/request/", PatientPortalAppointmentRequestView.as_view(), name="patient-portal-appointment-request"),
    path("api/patient-portal/appointments/<int:appointment_id>/cancel/", PatientPortalAppointmentCancelView.as_view(), name="patient-portal-appointment-cancel"),
    path("api/patient-portal/doctors/", PatientPortalDoctorsView.as_view(), name="patient-portal-doctors"),
    path("api/patient-portal/doctors/<int:doctor_id>/availability/", PatientPortalDoctorAvailabilityView.as_view(), name="patient-portal-doctor-availability"),
    path("api/patient-portal/specialties/", PatientPortalSpecialtiesView.as_view(), name="patient-portal-specialties"),
    path("api/patient-portal/prescriptions/", PatientPortalPrescriptionsView.as_view(), name="patient-portal-prescriptions"),
    path("api/patient-portal/prescriptions/<int:prescription_id>/", PatientPortalPrescriptionsView.as_view(), name="patient-portal-prescription-detail"),
    path("api/patient-portal/medical-orders/", PatientPortalMedicalOrdersView.as_view(), name="patient-portal-medical-orders"),
    path("api/patient-portal/medical-orders/<int:order_id>/", PatientPortalMedicalOrdersView.as_view(), name="patient-portal-medical-order-detail"),
    path("api/patient-portal/invoices/", PatientPortalInvoicesView.as_view(), name="patient-portal-invoices"),
    path("api/patient-portal/invoices/<int:invoice_id>/", PatientPortalInvoicesView.as_view(), name="patient-portal-invoice-detail"),
    path("api/patient-portal/payments/", PatientPortalPaymentsView.as_view(), name="patient-portal-payments"),
    path("api/patient-portal/medical-record-summary/", PatientPortalMedicalRecordSummaryView.as_view(), name="patient-portal-medical-record-summary"),
    path("api/patient-portal/notifications/", PatientPortalNotificationsView.as_view(), name="patient-portal-notifications"),
    path("api/patient-portal/notifications/unread-count/", PatientPortalUnreadNotificationsView.as_view(), name="patient-portal-notifications-unread"),
    path("api/patient-portal/clinic-info/", PatientPortalClinicInfoView.as_view(), name="patient-portal-clinic-info"),
    path("api/patient-portal/documents/", PatientPortalDocumentsView.as_view(), name="patient-portal-documents"),
    path("api/patient-portal/documents/<int:document_id>/", PatientPortalDocumentsView.as_view(), name="patient-portal-document-detail"),
    path("api/patient-portal/documents/<int:document_id>/download/", PatientPortalDocumentFileView.as_view(), {"mode": "download"}, name="patient-portal-document-download"),
    path("api/patient-portal/documents/<int:document_id>/preview/", PatientPortalDocumentFileView.as_view(), {"mode": "preview"}, name="patient-portal-document-preview"),
    path("api/patients/<int:patient_id>/documents/", PatientDocumentsView.as_view(), name="patient-documents"),
    path("api/medical-records/<int:record_id>/documents/", MedicalRecordDocumentsView.as_view(), name="medical-record-documents"),
    path("api/consultations/<int:consultation_id>/documents/", ConsultationDocumentsView.as_view(), name="consultation-documents"),
    path("api/appointments/<int:appointment_id>/documents/", AppointmentDocumentsView.as_view(), name="appointment-documents"),
    path("api/medical-orders/<int:order_id>/documents/", MedicalOrderDocumentsView.as_view(), name="medical-order-documents"),
    path("api/audit/my-activity/", AuditLogViewSet.as_view({"get": "my_activity"}), name="audit-my-activity"),
    path("api/audit/summary/", AuditStatsViewSet.as_view({"get": "list"}), name="audit-summary"),
    path("api/notifications/preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("api/notifications/stats/", NotificationStatsView.as_view(), name="notification-stats"),
    path("api/notifications/generate-inventory-alerts/", GenerateInventoryAlertsView.as_view(), name="notification-generate-inventory-alerts"),
    path("api/notifications/generate-appointment-reminders/", GenerateAppointmentRemindersView.as_view(), name="notification-generate-appointment-reminders"),
    path("api/notifications/generate-billing-alerts/", GenerateBillingAlertsView.as_view(), name="notification-generate-billing-alerts"),
    path("api/", include(router.urls)),
]
