import { lazy, type ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";

import { DashboardLayout } from "../components/layout/DashboardLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { SessionExpiredPage } from "../features/auth/SessionExpiredPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { RoleProtectedRoute } from "../features/auth/RoleProtectedRoute";
import { RoleDashboardRedirect } from "../features/dashboard/RoleDashboardRedirect";
import { ForbiddenPage } from "../features/errors/ForbiddenPage";
import { NotFoundPage } from "../features/errors/NotFoundPage";

function lazyNamed(loader: () => Promise<Record<string, unknown>>, exportName: string) {
  return lazy(async () => ({
    default: (await loader())[exportName] as ComponentType<Record<string, unknown>>,
  }));
}

const ClinicDashboardPage = lazyNamed(() => import("../features/clinicAdmin/ClinicDashboardPage"), "ClinicDashboardPage");
const ClinicUserFormPage = lazyNamed(() => import("../features/clinicAdmin/ClinicUserFormPage"), "ClinicUserFormPage");
const ClinicUsersPage = lazyNamed(() => import("../features/clinicAdmin/ClinicUsersPage"), "ClinicUsersPage");
const MyClinicPage = lazyNamed(() => import("../features/clinicAdmin/MyClinicPage"), "MyClinicPage");
const ClinicDoctorsPage = lazyNamed(() => import("../features/doctors/ClinicDoctorsPage"), "ClinicDoctorsPage");
const DoctorDetailsPage = lazyNamed(() => import("../features/doctors/DoctorDetailsPage"), "DoctorDetailsPage");
const DoctorFormPage = lazyNamed(() => import("../features/doctors/DoctorFormPage"), "DoctorFormPage");
const DoctorSchedulesPage = lazyNamed(() => import("../features/doctors/DoctorSchedulesPage"), "DoctorSchedulesPage");
const SpecialtiesPage = lazyNamed(() => import("../features/doctors/SpecialtiesPage"), "SpecialtiesPage");
const DoctorDashboardPage = lazyNamed(() => import("../features/doctors/DoctorDashboardPage"), "DoctorDashboardPage");
const DoctorMySchedulesPage = lazyNamed(() => import("../features/doctors/DoctorMySchedulesPage"), "DoctorMySchedulesPage");
const DoctorProfilePage = lazyNamed(() => import("../features/doctors/DoctorProfilePage"), "DoctorProfilePage");
const ChangePasswordPage = lazyNamed(() => import("../features/profile/ChangePasswordPage"), "ChangePasswordPage");
const ProfilePage = lazyNamed(() => import("../features/profile/ProfilePage"), "ProfilePage");
const ClinicsPage = lazyNamed(() => import("../features/clinics/ClinicsPage"), "ClinicsPage");
const RolesPage = lazyNamed(() => import("../features/roles/RolesPage"), "RolesPage");
const UserCreatePage = lazyNamed(() => import("../features/users/UserCreatePage"), "UserCreatePage");
const UserDetailsPage = lazyNamed(() => import("../features/users/UserDetailsPage"), "UserDetailsPage");
const UsersPage = lazyNamed(() => import("../features/users/UsersPage"), "UsersPage");
const SuperAdminClinicFormPage = lazyNamed(() => import("../features/superadmin/SuperAdminClinicFormPage"), "SuperAdminClinicFormPage");
const SuperAdminClinicsPage = lazyNamed(() => import("../features/superadmin/SuperAdminClinicsPage"), "SuperAdminClinicsPage");
const SuperAdminDashboardPage = lazyNamed(() => import("../features/superadmin/SuperAdminDashboardPage"), "SuperAdminDashboardPage");
const SuperAdminUsersPage = lazyNamed(() => import("../features/superadmin/SuperAdminUsersPage"), "SuperAdminUsersPage");
const SuperAdminOperationsPage = lazyNamed(() => import("../features/superadmin/SuperAdminOperationsPage"), "SuperAdminOperationsPage");
const PatientDetailsPage = lazyNamed(() => import("../features/patients/PatientDetailsPage"), "PatientDetailsPage");
const PatientFormPage = lazyNamed(() => import("../features/patients/PatientFormPage"), "PatientFormPage");
const PatientsPage = lazyNamed(() => import("../features/patients/PatientsPage"), "PatientsPage");
const AppointmentDetailsPage = lazyNamed(() => import("../features/appointments/AppointmentDetailsPage"), "AppointmentDetailsPage");
const AppointmentFormPage = lazyNamed(() => import("../features/appointments/AppointmentFormPage"), "AppointmentFormPage");
const AppointmentsPage = lazyNamed(() => import("../features/appointments/AppointmentsPage"), "AppointmentsPage");
const ClinicCalendarPage = lazyNamed(() => import("../features/appointments/ClinicCalendarPage"), "ClinicCalendarPage");
const ClinicalHistoryPage = lazyNamed(() => import("../features/medicalRecords/ClinicalHistoryPage"), "ClinicalHistoryPage");
const ConsultationDetailsPage = lazyNamed(() => import("../features/medicalRecords/ConsultationDetailsPage"), "ConsultationDetailsPage");
const ConsultationFormPage = lazyNamed(() => import("../features/medicalRecords/ConsultationFormPage"), "ConsultationFormPage");
const ConsultationsPage = lazyNamed(() => import("../features/medicalRecords/ConsultationsPage"), "ConsultationsPage");
const MedicalRecordDetailsPage = lazyNamed(() => import("../features/medicalRecords/MedicalRecordDetailsPage"), "MedicalRecordDetailsPage");
const MedicalRecordsPage = lazyNamed(() => import("../features/medicalRecords/MedicalRecordsPage"), "MedicalRecordsPage");
const clinicalData = () => import("../features/prescriptions/ClinicalDataPages");
const DiagnosesPage = lazyNamed(clinicalData, "DiagnosesPage");
const MedicalOrdersPage = lazyNamed(clinicalData, "MedicalOrdersPage");
const PrescriptionsPage = lazyNamed(clinicalData, "PrescriptionsPage");
const billing = () => import("../features/billing/BillingPages");
const BillableServicesPage = lazyNamed(billing, "BillableServicesPage");
const BillingDashboardPage = lazyNamed(billing, "BillingDashboardPage");
const CashPage = lazyNamed(billing, "CashPage");
const CreditNotesPage = lazyNamed(billing, "CreditNotesPage");
const FiscalSettingsPage = lazyNamed(billing, "FiscalSettingsPage");
const InvoiceDetailPage = lazyNamed(billing, "InvoiceDetailPage");
const InvoicePrintPage = lazyNamed(billing, "InvoicePrintPage");
const InvoicesPage = lazyNamed(billing, "InvoicesPage");
const PaymentsPage = lazyNamed(billing, "PaymentsPage");
const inventory = () => import("../features/inventory/InventoryPages");
const InventoryAlertsPage = lazyNamed(inventory, "InventoryAlertsPage");
const InventoryCategoriesPage = lazyNamed(inventory, "InventoryCategoriesPage");
const InventoryDashboardPage = lazyNamed(inventory, "InventoryDashboardPage");
const InventoryItemsPage = lazyNamed(inventory, "InventoryItemsPage");
const InventoryLotsPage = lazyNamed(inventory, "InventoryLotsPage");
const InventoryMovementsPage = lazyNamed(inventory, "InventoryMovementsPage");
const purchases = () => import("../features/purchases/PurchasePages");
const PurchaseOrderDetailsPage = lazyNamed(purchases, "PurchaseOrderDetailsPage");
const PurchaseOrderFormPage = lazyNamed(purchases, "PurchaseOrderFormPage");
const PurchaseOrdersPage = lazyNamed(purchases, "PurchaseOrdersPage");
const PurchaseReceiptDetailsPage = lazyNamed(purchases, "PurchaseReceiptDetailsPage");
const PurchaseReceiptsPage = lazyNamed(purchases, "PurchaseReceiptsPage");
const PurchaseReceivePage = lazyNamed(purchases, "PurchaseReceivePage");
const PurchasesDashboardPage = lazyNamed(purchases, "PurchasesDashboardPage");
const SupplierDetailsPage = lazyNamed(purchases, "SupplierDetailsPage");
const SuppliersPage = lazyNamed(purchases, "SuppliersPage");
const reports = () => import("../features/reports/ReportsPages");
const AppointmentsReportPage = lazyNamed(reports, "AppointmentsReportPage");
const CashReportPage = lazyNamed(reports, "CashReportPage");
const ClinicDashboardAnalyticsPage = lazyNamed(reports, "ClinicDashboardAnalyticsPage");
const ConsultationsReportPage = lazyNamed(reports, "ConsultationsReportPage");
const DoctorDashboardAnalyticsPage = lazyNamed(reports, "DoctorDashboardAnalyticsPage");
const DoctorsReportPage = lazyNamed(reports, "DoctorsReportPage");
const FinancialReportPage = lazyNamed(reports, "FinancialReportPage");
const InventoryReportPage = lazyNamed(reports, "InventoryReportPage");
const PatientsReportPage = lazyNamed(reports, "PatientsReportPage");
const PurchasesReportPage = lazyNamed(reports, "PurchasesReportPage");
const ReceptionDashboardPage = lazyNamed(reports, "ReceptionDashboardPage");
const ReportsHomePage = lazyNamed(reports, "ReportsHomePage");
const SuperAdminReportsPage = lazyNamed(reports, "SuperAdminReportsPage");
const audit = () => import("../features/audit/AuditPages");
const AuditDashboardPage = lazyNamed(audit, "AuditDashboardPage");
const AuditLogDetailsPage = lazyNamed(audit, "AuditLogDetailsPage");
const AuditLogsPage = lazyNamed(audit, "AuditLogsPage");
const notifications = () => import("../features/notifications/NotificationPages");
const NotificationDetailsPage = lazyNamed(notifications, "NotificationDetailsPage");
const NotificationPreferencesPage = lazyNamed(notifications, "NotificationPreferencesPage");
const NotificationsAdminPage = lazyNamed(notifications, "NotificationsAdminPage");
const NotificationsPage = lazyNamed(notifications, "NotificationsPage");
const clinicSettings = () => import("../features/clinicSettings/ClinicSettingsPages");
const ClinicSettingsPage = lazyNamed(clinicSettings, "ClinicSettingsPage");
const ClinicSettingsSummaryPage = lazyNamed(clinicSettings, "ClinicSettingsSummaryPage");
const ClinicWorkflowSettingsPage = lazyNamed(clinicSettings, "ClinicWorkflowSettingsPage");
const SuperAdminClinicSettingsPage = lazyNamed(clinicSettings, "SuperAdminClinicSettingsPage");
const subscriptions = () => import("../features/subscriptions/SubscriptionPages");
const ClinicSubscriptionDetailsPage = lazyNamed(subscriptions, "ClinicSubscriptionDetailsPage");
const ClinicSubscriptionsPage = lazyNamed(subscriptions, "ClinicSubscriptionsPage");
const MySubscriptionPage = lazyNamed(subscriptions, "MySubscriptionPage");
const SubscriptionPlansPage = lazyNamed(subscriptions, "SubscriptionPlansPage");
const patientPortal = () => import("../features/patientPortal/PatientPortalPages");
const PatientClinicInfoPage = lazyNamed(patientPortal, "PatientClinicInfoPage");
const PatientMedicalRecordSummaryPage = lazyNamed(patientPortal, "PatientMedicalRecordSummaryPage");
const PatientPortalAppointmentDetailsPage = lazyNamed(patientPortal, "PatientPortalAppointmentDetailsPage");
const PatientPortalAppointmentsPage = lazyNamed(patientPortal, "PatientPortalAppointmentsPage");
const PatientPortalCreditNotesPage = lazyNamed(patientPortal, "PatientPortalCreditNotesPage");
const PatientPortalDashboardPage = lazyNamed(patientPortal, "PatientPortalDashboardPage");
const PatientPortalInvoiceDetailsPage = lazyNamed(patientPortal, "PatientPortalInvoiceDetailsPage");
const PatientPortalInvoicesPage = lazyNamed(patientPortal, "PatientPortalInvoicesPage");
const PatientPortalMedicalOrderDetailsPage = lazyNamed(patientPortal, "PatientPortalMedicalOrderDetailsPage");
const PatientPortalMedicalOrdersPage = lazyNamed(patientPortal, "PatientPortalMedicalOrdersPage");
const PatientPortalNotificationDetailsPage = lazyNamed(patientPortal, "PatientPortalNotificationDetailsPage");
const PatientPortalNotificationsPage = lazyNamed(patientPortal, "PatientPortalNotificationsPage");
const PatientPortalPaymentDetailsPage = lazyNamed(patientPortal, "PatientPortalPaymentDetailsPage");
const PatientPortalPaymentsPage = lazyNamed(patientPortal, "PatientPortalPaymentsPage");
const PatientPortalPrescriptionDetailsPage = lazyNamed(patientPortal, "PatientPortalPrescriptionDetailsPage");
const PatientPortalPrescriptionsPage = lazyNamed(patientPortal, "PatientPortalPrescriptionsPage");
const PatientPortalProfilePage = lazyNamed(patientPortal, "PatientPortalProfilePage");
const PatientRequestAppointmentPage = lazyNamed(patientPortal, "PatientRequestAppointmentPage");
const documents = () => import("../features/documents/DocumentsPages");
const ClinicalDocumentsPage = lazyNamed(documents, "ClinicalDocumentsPage");
const DocumentCategoriesPage = lazyNamed(documents, "DocumentCategoriesPage");
const DocumentDetailsPage = lazyNamed(documents, "DocumentDetailsPage");
const DocumentUploadPage = lazyNamed(documents, "DocumentUploadPage");
const PatientDocumentsPage = lazyNamed(documents, "PatientDocumentsPage");
const PatientPortalDocumentDetailsPage = lazyNamed(documents, "PatientPortalDocumentDetailsPage");
const PatientPortalDocumentsPage = lazyNamed(documents, "PatientPortalDocumentsPage");
const security = () => import("../features/security/SecurityPages");
const AccountLocksAdminPage = lazyNamed(security, "AccountLocksAdminPage");
const ActiveSessionsPage = lazyNamed(security, "ActiveSessionsPage");
const AdminSessionsPage = lazyNamed(security, "AdminSessionsPage");
const EmailVerificationPage = lazyNamed(security, "EmailVerificationPage");
const ForgotPasswordPage = lazyNamed(security, "ForgotPasswordPage");
const PasswordSecurityPage = lazyNamed(security, "PasswordSecurityPage");
const ResetPasswordPage = lazyNamed(security, "ResetPasswordPage");
const SecurityActivityPage = lazyNamed(security, "SecurityActivityPage");
const SecurityCenterPage = lazyNamed(security, "SecurityCenterPage");
const SecuritySettingsPage = lazyNamed(security, "SecuritySettingsPage");
const VerifyEmailPage = lazyNamed(security, "VerifyEmailPage");
const admissions = () => import("../features/admissions/AdmissionsPages");
const AdmissionVisitDetailsPage = lazyNamed(admissions, "AdmissionVisitDetailsPage");
const AdmissionsDashboardPage = lazyNamed(admissions, "AdmissionsDashboardPage");
const DoctorWaitingRoomPage = lazyNamed(admissions, "DoctorWaitingRoomPage");
const NewWalkInVisitPage = lazyNamed(admissions, "NewWalkInVisitPage");
const PendingBillingVisitsPage = lazyNamed(admissions, "PendingBillingVisitsPage");
const TriageQueuePage = lazyNamed(admissions, "TriageQueuePage");
const hospitalization = () => import("../features/hospitalization/HospitalizationPages");
const HospitalizationDashboardPage = lazyNamed(hospitalization, "HospitalizationDashboardPage");
const HospitalizationDetailPage = lazyNamed(hospitalization, "HospitalizationDetailPage");
const HospitalizationFormPage = lazyNamed(hospitalization, "HospitalizationFormPage");
const HospitalizedPatientsPage = lazyNamed(hospitalization, "HospitalizedPatientsPage");
const HospitalRoomsBedsPage = lazyNamed(hospitalization, "HospitalRoomsBedsPage");

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/session-expired",
    element: <SessionExpiredPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmailPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <RoleDashboardRedirect /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/change-password", element: <ChangePasswordPage /> },
          { path: "/security", element: <SecurityCenterPage /> },
          { path: "/security/sessions", element: <ActiveSessionsPage /> },
          { path: "/security/email", element: <EmailVerificationPage /> },
          { path: "/security/password", element: <PasswordSecurityPage /> },
          { path: "/security/activity", element: <SecurityActivityPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/notifications/preferences", element: <NotificationPreferencesPage /> },
          { path: "/notifications/:id", element: <NotificationDetailsPage /> },
          { path: "/forbidden", element: <ForbiddenPage /> },
          {
            element: <RoleProtectedRoute allowedRoles={["superadmin"]} />,
            children: [
              { path: "/users", element: <UsersPage /> },
              { path: "/users/new", element: <UserCreatePage /> },
              { path: "/users/:id", element: <UserDetailsPage /> },
              { path: "/roles", element: <RolesPage /> },
              { path: "/clinics", element: <ClinicsPage /> },
              { path: "/superadmin/dashboard", element: <SuperAdminDashboardPage /> },
              { path: "/superadmin/clinics", element: <SuperAdminClinicsPage /> },
              { path: "/superadmin/clinics/new", element: <SuperAdminClinicFormPage /> },
              { path: "/superadmin/clinics/:id/edit", element: <SuperAdminClinicFormPage /> },
              { path: "/superadmin/users", element: <SuperAdminUsersPage /> },
              { path: "/superadmin/operations", element: <SuperAdminOperationsPage /> },
              { path: "/superadmin/users/new", element: <UserCreatePage /> },
              { path: "/superadmin/reports", element: <SuperAdminReportsPage /> },
              { path: "/superadmin/reports/clinics", element: <SuperAdminReportsPage /> },
              { path: "/superadmin/reports/usage", element: <SuperAdminReportsPage /> },
              { path: "/superadmin/audit", element: <AuditDashboardPage basePath="/superadmin/audit" /> },
              { path: "/superadmin/audit/logs", element: <AuditLogsPage basePath="/superadmin/audit" /> },
              { path: "/superadmin/audit/logs/:id", element: <AuditLogDetailsPage basePath="/superadmin/audit" /> },
              { path: "/superadmin/notifications", element: <NotificationsAdminPage superadmin /> },
              { path: "/superadmin/clinic-settings", element: <ClinicSettingsSummaryPage /> },
              { path: "/superadmin/clinics/:id/settings", element: <SuperAdminClinicSettingsPage /> },
              { path: "/superadmin/subscriptions", element: <ClinicSubscriptionsPage /> },
              { path: "/superadmin/subscriptions/plans", element: <SubscriptionPlansPage /> },
              { path: "/superadmin/subscriptions/clinics", element: <ClinicSubscriptionsPage /> },
              { path: "/superadmin/subscriptions/clinics/:clinicId", element: <ClinicSubscriptionDetailsPage /> },
            ],
          },
          {
            element: <RoleProtectedRoute allowedRoles={["admin"]} />,
            children: [
              { path: "/clinic/dashboard", element: <ClinicDashboardPage /> },
              { path: "/clinic/my-clinic", element: <MyClinicPage /> },
              { path: "/clinic/users", element: <ClinicUsersPage /> },
              { path: "/clinic/users/new", element: <ClinicUserFormPage /> },
              { path: "/clinic/users/:id/edit", element: <ClinicUserFormPage /> },
              { path: "/clinic/doctors", element: <ClinicDoctorsPage /> },
              { path: "/clinic/doctors/new", element: <DoctorFormPage /> },
              { path: "/clinic/doctors/:id", element: <DoctorDetailsPage /> },
              { path: "/clinic/doctors/:id/edit", element: <DoctorFormPage /> },
              { path: "/clinic/doctors/:id/schedules", element: <DoctorSchedulesPage /> },
              { path: "/clinic/specialties", element: <SpecialtiesPage /> },
              { path: "/clinic/settings", element: <ClinicSettingsPage /> },
              { path: "/clinic/settings/general", element: <ClinicSettingsPage /> },
              { path: "/clinic/settings/branding", element: <ClinicSettingsPage /> },
              { path: "/clinic/settings/billing", element: <ClinicSettingsPage /> },
              { path: "/clinic/settings/fiscal", element: <FiscalSettingsPage /> },
              { path: "/clinic/settings/workflow", element: <ClinicWorkflowSettingsPage /> },
              { path: "/clinic/settings/appointments", element: <ClinicSettingsPage /> },
              { path: "/clinic/settings/patient-portal", element: <ClinicSettingsPage /> },
              { path: "/clinic/subscription", element: <MySubscriptionPage /> },
              { path: "/clinic/subscription/usage", element: <MySubscriptionPage /> },
              { path: "/clinic/subscription/features", element: <MySubscriptionPage /> },
              { path: "/clinic/documents/categories", element: <DocumentCategoriesPage /> },
              { path: "/security/admin/account-locks", element: <AccountLocksAdminPage /> },
              { path: "/security/admin/sessions", element: <AdminSessionsPage /> },
              { path: "/security/settings", element: <SecuritySettingsPage /> },
            ],
          },
          {
            element: <RoleProtectedRoute allowedRoles={["admin", "medico", "enfermera", "recepcionista", "cajero", "recepcionista_caja"]} />,
            children: [
              { path: "/clinic/patients", element: <PatientsPage /> },
              { path: "/clinic/admissions", element: <AdmissionsDashboardPage /> },
              { path: "/clinic/admissions/new", element: <NewWalkInVisitPage /> },
              { path: "/clinic/admissions/visits/:id", element: <AdmissionVisitDetailsPage /> },
              { path: "/clinic/triage", element: <TriageQueuePage /> },
              { path: "/clinic/hospitalization", element: <HospitalizationDashboardPage /> },
              { path: "/clinic/hospitalization/admissions", element: <HospitalizedPatientsPage /> },
              { path: "/clinic/hospitalization/admissions/:id", element: <HospitalizationDetailPage /> },
              { path: "/clinic/hospitalization/new", element: <HospitalizationFormPage /> },
              { path: "/clinic/hospitalization/rooms-beds", element: <HospitalRoomsBedsPage /> },
              { path: "/clinic/patients/new", element: <PatientFormPage /> },
              { path: "/clinic/patients/:id", element: <PatientDetailsPage /> },
              { path: "/clinic/patients/:id/edit", element: <PatientFormPage /> },
              { path: "/clinic/patients/:patientId/documents", element: <PatientDocumentsPage /> },
              { path: "/clinic/appointments", element: <AppointmentsPage /> },
              { path: "/clinic/appointments/new", element: <AppointmentFormPage /> },
              { path: "/clinic/appointments/:id", element: <AppointmentDetailsPage /> },
              { path: "/clinic/appointments/:id/edit", element: <AppointmentFormPage /> },
              { path: "/clinic/appointments/:appointmentId/documents", element: <ClinicalDocumentsPage /> },
              { path: "/clinic/calendar", element: <ClinicCalendarPage /> },
              { path: "/clinic/medical-records", element: <MedicalRecordsPage /> },
              { path: "/clinic/medical-records/:id", element: <MedicalRecordDetailsPage /> },
              { path: "/clinic/medical-records/:recordId/documents", element: <ClinicalDocumentsPage /> },
              { path: "/clinic/patients/:patientId/clinical-history", element: <ClinicalHistoryPage /> },
              { path: "/clinic/consultations", element: <ConsultationsPage /> },
              { path: "/clinic/consultations/new", element: <ConsultationFormPage /> },
              { path: "/clinic/consultations/:id", element: <ConsultationDetailsPage /> },
              { path: "/clinic/consultations/:id/edit", element: <ConsultationFormPage /> },
              { path: "/clinic/consultations/:consultationId/documents", element: <ClinicalDocumentsPage /> },
              { path: "/clinic/diagnoses", element: <DiagnosesPage /> },
              { path: "/clinic/prescriptions", element: <PrescriptionsPage /> },
              { path: "/clinic/medical-orders", element: <MedicalOrdersPage /> },
              { path: "/clinic/documents", element: <ClinicalDocumentsPage /> },
              { path: "/clinic/documents/upload", element: <DocumentUploadPage /> },
              { path: "/clinic/documents/:id", element: <DocumentDetailsPage /> },
              { path: "/clinic/billing", element: <BillingDashboardPage /> },
              { path: "/clinic/billing/services", element: <BillableServicesPage /> },
              { path: "/clinic/billing/invoices", element: <InvoicesPage /> },
              { path: "/clinic/billing/invoices/new", element: <InvoicesPage /> },
              { path: "/clinic/billing/invoices/:id", element: <InvoiceDetailPage /> },
              { path: "/clinic/billing/invoices/:id/print", element: <InvoicePrintPage /> },
              { path: "/clinic/billing/credit-notes", element: <CreditNotesPage /> },
              { path: "/clinic/billing/payments", element: <PaymentsPage /> },
              { path: "/clinic/billing/cash", element: <CashPage /> },
              { path: "/clinic/billing/pending", element: <PendingBillingVisitsPage /> },
              { path: "/clinic/inventory", element: <InventoryDashboardPage /> },
              { path: "/clinic/inventory/items", element: <InventoryItemsPage /> },
              { path: "/clinic/inventory/categories", element: <InventoryCategoriesPage /> },
              { path: "/clinic/inventory/lots", element: <InventoryLotsPage /> },
              { path: "/clinic/inventory/movements", element: <InventoryMovementsPage /> },
              { path: "/clinic/inventory/alerts", element: <InventoryAlertsPage /> },
              { path: "/clinic/purchases", element: <PurchasesDashboardPage /> },
              { path: "/clinic/purchases/suppliers", element: <SuppliersPage /> },
              { path: "/clinic/purchases/suppliers/new", element: <SuppliersPage /> },
              { path: "/clinic/purchases/suppliers/:id", element: <SupplierDetailsPage /> },
              { path: "/clinic/purchases/suppliers/:id/edit", element: <SupplierDetailsPage /> },
              { path: "/clinic/purchases/orders", element: <PurchaseOrdersPage /> },
              { path: "/clinic/purchases/orders/new", element: <PurchaseOrderFormPage /> },
              { path: "/clinic/purchases/orders/:id", element: <PurchaseOrderDetailsPage /> },
              { path: "/clinic/purchases/orders/:id/edit", element: <PurchaseOrderDetailsPage /> },
              { path: "/clinic/purchases/orders/:id/receive", element: <PurchaseReceivePage /> },
              { path: "/clinic/purchases/receipts", element: <PurchaseReceiptsPage /> },
              { path: "/clinic/purchases/receipts/:id", element: <PurchaseReceiptDetailsPage /> },
              { path: "/clinic/reports", element: <ReportsHomePage /> },
              { path: "/clinic/reports/dashboard", element: <ClinicDashboardAnalyticsPage /> },
              { path: "/clinic/reports/appointments", element: <AppointmentsReportPage /> },
              { path: "/clinic/reports/patients", element: <PatientsReportPage /> },
              { path: "/clinic/reports/doctors", element: <DoctorsReportPage /> },
              { path: "/clinic/reports/consultations", element: <ConsultationsReportPage /> },
              { path: "/clinic/reports/financial", element: <FinancialReportPage /> },
              { path: "/clinic/reports/cash", element: <CashReportPage /> },
              { path: "/clinic/reports/inventory", element: <InventoryReportPage /> },
              { path: "/clinic/reports/purchases", element: <PurchasesReportPage /> },
              { path: "/clinic/reception-dashboard", element: <ReceptionDashboardPage /> },
              { path: "/clinic/audit", element: <AuditDashboardPage /> },
              { path: "/clinic/audit/logs", element: <AuditLogsPage /> },
              { path: "/clinic/audit/logs/:id", element: <AuditLogDetailsPage /> },
              { path: "/clinic/notifications/admin", element: <NotificationsAdminPage /> },
            ],
          },
          {
            element: <RoleProtectedRoute allowedRoles={["medico"]} />,
            children: [
              { path: "/doctor/dashboard", element: <DoctorDashboardPage /> },
              { path: "/doctor/waiting-room", element: <DoctorWaitingRoomPage /> },
              { path: "/doctor/profile", element: <DoctorProfilePage /> },
              { path: "/doctor/schedules", element: <DoctorMySchedulesPage /> },
              { path: "/doctor/appointments", element: <AppointmentsPage mode="doctor" /> },
              { path: "/doctor/appointments/:id", element: <AppointmentDetailsPage /> },
              { path: "/doctor/calendar", element: <ClinicCalendarPage doctorOnly /> },
              { path: "/doctor/consultations", element: <ConsultationsPage doctorOnly /> },
              { path: "/doctor/consultations/:id", element: <ConsultationDetailsPage /> },
              { path: "/doctor/consultations/:id/edit", element: <ConsultationFormPage /> },
              { path: "/doctor/consultations/:consultationId/documents", element: <ClinicalDocumentsPage /> },
              { path: "/doctor/diagnoses", element: <DiagnosesPage /> },
              { path: "/doctor/prescriptions", element: <PrescriptionsPage /> },
              { path: "/doctor/medical-orders", element: <MedicalOrdersPage /> },
              { path: "/doctor/documents", element: <ClinicalDocumentsPage /> },
              { path: "/doctor/patients/:patientId/documents", element: <PatientDocumentsPage /> },
              { path: "/doctor/inventory/items", element: <InventoryItemsPage doctorOnly /> },
              { path: "/doctor/reports", element: <DoctorDashboardAnalyticsPage /> },
            ],
          },
          {
            element: <RoleProtectedRoute allowedRoles={["paciente"]} />,
            children: [
              { path: "/patient/dashboard", element: <PatientPortalDashboardPage /> },
              { path: "/patient/profile", element: <PatientPortalProfilePage /> },
              { path: "/patient/appointments", element: <PatientPortalAppointmentsPage /> },
              { path: "/patient/appointments/request", element: <PatientRequestAppointmentPage /> },
              { path: "/patient/appointments/new", element: <PatientRequestAppointmentPage /> },
              { path: "/patient/appointments/:id", element: <PatientPortalAppointmentDetailsPage /> },
              { path: "/patient/appointments/:id/reschedule", element: <PatientRequestAppointmentPage /> },
              { path: "/patient/medical-record", element: <PatientMedicalRecordSummaryPage /> },
              { path: "/patient/diagnoses", element: <DiagnosesPage patientOnly /> },
              { path: "/patient/prescriptions", element: <PatientPortalPrescriptionsPage /> },
              { path: "/patient/prescriptions/:id", element: <PatientPortalPrescriptionDetailsPage /> },
              { path: "/patient/medical-orders", element: <PatientPortalMedicalOrdersPage /> },
              { path: "/patient/medical-orders/:id", element: <PatientPortalMedicalOrderDetailsPage /> },
              { path: "/patient/documents", element: <PatientPortalDocumentsPage /> },
              { path: "/patient/documents/:id", element: <PatientPortalDocumentDetailsPage /> },
              { path: "/patient/billing", element: <PatientPortalInvoicesPage /> },
              { path: "/patient/invoices", element: <PatientPortalInvoicesPage /> },
              { path: "/patient/invoices/:id", element: <PatientPortalInvoiceDetailsPage /> },
              { path: "/patient/invoices/:id/print", element: <InvoicePrintPage patientPortal /> },
              { path: "/patient/payments", element: <PatientPortalPaymentsPage /> },
              { path: "/patient/payments/:id", element: <PatientPortalPaymentDetailsPage /> },
              { path: "/patient/credit-notes", element: <PatientPortalCreditNotesPage /> },
              { path: "/patient/notifications", element: <PatientPortalNotificationsPage /> },
              { path: "/patient/notifications/:id", element: <PatientPortalNotificationDetailsPage /> },
              { path: "/patient/clinic-info", element: <PatientClinicInfoPage /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
