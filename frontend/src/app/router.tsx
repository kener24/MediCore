import { Navigate, createBrowserRouter } from "react-router-dom";

import { DashboardLayout } from "../components/layout/DashboardLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { RoleProtectedRoute } from "../features/auth/RoleProtectedRoute";
import { RoleDashboardRedirect } from "../features/dashboard/RoleDashboardRedirect";
import { ForbiddenPage } from "../features/errors/ForbiddenPage";
import { NotFoundPage } from "../features/errors/NotFoundPage";
import { ClinicDashboardPage } from "../features/clinicAdmin/ClinicDashboardPage";
import { ClinicUserFormPage } from "../features/clinicAdmin/ClinicUserFormPage";
import { ClinicUsersPage } from "../features/clinicAdmin/ClinicUsersPage";
import { MyClinicPage } from "../features/clinicAdmin/MyClinicPage";
import { ClinicDoctorsPage } from "../features/doctors/ClinicDoctorsPage";
import { DoctorDetailsPage } from "../features/doctors/DoctorDetailsPage";
import { DoctorFormPage } from "../features/doctors/DoctorFormPage";
import { DoctorSchedulesPage } from "../features/doctors/DoctorSchedulesPage";
import { SpecialtiesPage } from "../features/doctors/SpecialtiesPage";
import { DoctorDashboardPage } from "../features/doctors/DoctorDashboardPage";
import { DoctorMySchedulesPage } from "../features/doctors/DoctorMySchedulesPage";
import { DoctorProfilePage } from "../features/doctors/DoctorProfilePage";
import { ChangePasswordPage } from "../features/profile/ChangePasswordPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { ClinicsPage } from "../features/clinics/ClinicsPage";
import { RolesPage } from "../features/roles/RolesPage";
import { UserCreatePage } from "../features/users/UserCreatePage";
import { UserDetailsPage } from "../features/users/UserDetailsPage";
import { UsersPage } from "../features/users/UsersPage";
import { SuperAdminClinicFormPage } from "../features/superadmin/SuperAdminClinicFormPage";
import { SuperAdminClinicsPage } from "../features/superadmin/SuperAdminClinicsPage";
import { SuperAdminDashboardPage } from "../features/superadmin/SuperAdminDashboardPage";
import { SuperAdminUsersPage } from "../features/superadmin/SuperAdminUsersPage";
import { PatientDashboardPage } from "../features/patients/PatientDashboardPage";
import { PatientDetailsPage } from "../features/patients/PatientDetailsPage";
import { PatientFormPage } from "../features/patients/PatientFormPage";
import { PatientProfilePage } from "../features/patients/PatientProfilePage";
import { PatientsPage } from "../features/patients/PatientsPage";
import { AppointmentDetailsPage } from "../features/appointments/AppointmentDetailsPage";
import { AppointmentFormPage } from "../features/appointments/AppointmentFormPage";
import { AppointmentsPage } from "../features/appointments/AppointmentsPage";
import { ClinicCalendarPage } from "../features/appointments/ClinicCalendarPage";
import { ClinicalHistoryPage } from "../features/medicalRecords/ClinicalHistoryPage";
import { ConsultationDetailsPage } from "../features/medicalRecords/ConsultationDetailsPage";
import { ConsultationFormPage } from "../features/medicalRecords/ConsultationFormPage";
import { ConsultationsPage } from "../features/medicalRecords/ConsultationsPage";
import { MedicalRecordDetailsPage } from "../features/medicalRecords/MedicalRecordDetailsPage";
import { MedicalRecordsPage } from "../features/medicalRecords/MedicalRecordsPage";
import { PatientMedicalRecordPage } from "../features/medicalRecords/PatientMedicalRecordPage";
import { DiagnosesPage, MedicalOrdersPage, PrescriptionsPage } from "../features/prescriptions/ClinicalDataPages";
import { BillableServicesPage, BillingDashboardPage, CashPage, FiscalSettingsPage, InvoiceDetailPage, InvoicePrintPage, InvoicesPage, PaymentsPage } from "../features/billing/BillingPages";
import { InventoryAlertsPage, InventoryCategoriesPage, InventoryDashboardPage, InventoryItemsPage, InventoryLotsPage, InventoryMovementsPage } from "../features/inventory/InventoryPages";
import { PurchaseOrderDetailsPage, PurchaseOrderFormPage, PurchaseOrdersPage, PurchaseReceiptDetailsPage, PurchaseReceiptsPage, PurchaseReceivePage, PurchasesDashboardPage, SupplierDetailsPage, SuppliersPage } from "../features/purchases/PurchasePages";
import { AppointmentsReportPage, CashReportPage, ClinicDashboardAnalyticsPage, ConsultationsReportPage, DoctorDashboardAnalyticsPage, DoctorsReportPage, FinancialReportPage, InventoryReportPage, PatientsReportPage, PurchasesReportPage, ReceptionDashboardPage, ReportsHomePage, SuperAdminReportsPage } from "../features/reports/ReportsPages";
import { AuditDashboardPage, AuditLogDetailsPage, AuditLogsPage } from "../features/audit/AuditPages";
import { NotificationDetailsPage, NotificationPreferencesPage, NotificationsAdminPage, NotificationsPage } from "../features/notifications/NotificationPages";
import { ClinicSettingsPage, ClinicSettingsSummaryPage, SuperAdminClinicSettingsPage } from "../features/clinicSettings/ClinicSettingsPages";
import { ClinicSubscriptionDetailsPage, ClinicSubscriptionsPage, MySubscriptionPage, SubscriptionPlansPage } from "../features/subscriptions/SubscriptionPages";
import { PatientClinicInfoPage, PatientMedicalRecordSummaryPage, PatientPortalAppointmentDetailsPage, PatientPortalAppointmentsPage, PatientPortalDashboardPage, PatientPortalInvoiceDetailsPage, PatientPortalInvoicesPage, PatientPortalMedicalOrderDetailsPage, PatientPortalMedicalOrdersPage, PatientPortalPaymentsPage, PatientPortalPrescriptionDetailsPage, PatientPortalPrescriptionsPage, PatientPortalProfilePage, PatientRequestAppointmentPage } from "../features/patientPortal/PatientPortalPages";
import { ClinicalDocumentsPage, DocumentCategoriesPage, DocumentDetailsPage, DocumentUploadPage, PatientDocumentsPage, PatientPortalDocumentDetailsPage, PatientPortalDocumentsPage } from "../features/documents/DocumentsPages";
import { AccountLocksAdminPage, ActiveSessionsPage, AdminSessionsPage, EmailVerificationPage, ForgotPasswordPage, PasswordSecurityPage, ResetPasswordPage, SecurityActivityPage, SecurityCenterPage, SecuritySettingsPage, VerifyEmailPage } from "../features/security/SecurityPages";
import { AdmissionVisitDetailsPage, AdmissionsDashboardPage, DoctorWaitingRoomPage, NewWalkInVisitPage, PendingBillingVisitsPage, TriageQueuePage } from "../features/admissions/AdmissionsPages";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
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
          { path: "/users", element: <UsersPage /> },
          { path: "/users/new", element: <UserCreatePage /> },
          { path: "/users/:id", element: <UserDetailsPage /> },
          { path: "/roles", element: <RolesPage /> },
          { path: "/clinics", element: <ClinicsPage /> },
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
              { path: "/superadmin/dashboard", element: <SuperAdminDashboardPage /> },
              { path: "/superadmin/clinics", element: <SuperAdminClinicsPage /> },
              { path: "/superadmin/clinics/new", element: <SuperAdminClinicFormPage /> },
              { path: "/superadmin/clinics/:id/edit", element: <SuperAdminClinicFormPage /> },
              { path: "/superadmin/users", element: <SuperAdminUsersPage /> },
              { path: "/superadmin/users/new", element: <UserCreatePage /> },
              { path: "/superadmin/patients", element: <PatientsPage /> },
              { path: "/superadmin/appointments", element: <AppointmentsPage mode="superadmin" /> },
              { path: "/superadmin/appointments/:id", element: <AppointmentDetailsPage /> },
              { path: "/superadmin/reports", element: <SuperAdminReportsPage /> },
              { path: "/superadmin/reports/clinics", element: <SuperAdminReportsPage /> },
              { path: "/superadmin/reports/financial", element: <FinancialReportPage /> },
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
            element: <RoleProtectedRoute allowedRoles={["admin", "superadmin"]} />,
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
            element: <RoleProtectedRoute allowedRoles={["admin", "superadmin", "medico", "enfermera", "recepcionista"]} />,
            children: [
              { path: "/clinic/patients", element: <PatientsPage /> },
              { path: "/clinic/admissions", element: <AdmissionsDashboardPage /> },
              { path: "/clinic/admissions/new", element: <NewWalkInVisitPage /> },
              { path: "/clinic/admissions/visits/:id", element: <AdmissionVisitDetailsPage /> },
              { path: "/clinic/triage", element: <TriageQueuePage /> },
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
              { path: "/patient/clinic-info", element: <PatientClinicInfoPage /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
