import { StyleSheet, View } from 'react-native';

import { QuickActionCard } from '@/components/QuickActionCard';
import type { PatientPortalPermissions } from '@/features/patient/types/patientDashboard.types';

interface PatientQuickActionsProps {
  onAppointments?: () => void;
  onDocuments?: () => void;
  onHistory?: () => void;
  onInvoices?: () => void;
  onMedicalOrders?: () => void;
  onNavigate?: (target: 'appointments' | 'documents' | 'history' | 'invoices' | 'medicalOrders' | 'payments' | 'prescriptions' | 'profile' | 'requestAppointment') => void;
  onPayments?: () => void;
  onPrescriptions?: () => void;
  onProfile?: () => void;
  onRequestAppointment?: () => void;
  permissions?: PatientPortalPermissions;
}

export function PatientQuickActions({
  onAppointments,
  onDocuments,
  onHistory,
  onInvoices,
  onMedicalOrders,
  onNavigate,
  onPayments,
  onPrescriptions,
  onProfile,
  onRequestAppointment,
  permissions = {},
}: PatientQuickActionsProps) {
  const navigate = (target: Parameters<NonNullable<PatientQuickActionsProps['onNavigate']>>[0], fallback?: () => void) => {
    if (onNavigate) onNavigate(target);
    else fallback?.();
  };

  return (
    <View style={styles.container}>
      <QuickActionCard
        description="Consulta tus próximas citas e historial."
        icon="calendar-check-outline"
        onPress={() => navigate('appointments', onAppointments)}
        title="Mis citas"
      />
      {permissions.can_request_appointments !== false ? <QuickActionCard
        description="Solicita una nueva cita presencial o en línea."
        icon="calendar-plus"
        onPress={() => navigate('requestAppointment', onRequestAppointment)}
        title="Solicitar cita"
      /> : null}
      {permissions.can_view_medical_record !== false ? <QuickActionCard
        description="Resumen de consultas y diagnósticos."
        icon="clipboard-pulse-outline"
        onPress={() => navigate('history', onHistory)}
        title="Historial"
      /> : null}
      {permissions.can_view_prescriptions !== false ? <QuickActionCard
        description="Medicamentos e indicaciones médicas."
        icon="pill"
        onPress={() => navigate('prescriptions', onPrescriptions)}
        title="Recetas"
      /> : null}
      {permissions.can_view_medical_orders !== false ? <QuickActionCard
        description="Laboratorio, imágenes y solicitudes."
        icon="clipboard-text-outline"
        onPress={() => navigate('medicalOrders', onMedicalOrders)}
        title="Órdenes"
      /> : null}
      {permissions.can_view_invoices !== false ? <QuickActionCard
        description="Facturas, pagos y saldos."
        icon="receipt-text-outline"
        onPress={() => navigate('invoices', onInvoices)}
        title="Facturas"
      /> : null}
      {permissions.can_view_invoices !== false ? <QuickActionCard
        description="Historial de pagos aplicados."
        icon="cash-check"
        onPress={() => navigate('payments', onPayments)}
        title="Pagos"
      /> : null}
      {permissions.can_view_documents !== false ? <QuickActionCard
        description="Documentos clínicos visibles."
        icon="file-document-outline"
        onPress={() => navigate('documents', onDocuments)}
        title="Documentos"
      /> : null}
      <QuickActionCard
        description="Datos personales y contacto de emergencia."
        icon="account-circle-outline"
        onPress={() => navigate('profile', onProfile)}
        title="Perfil"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
