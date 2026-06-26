import { StyleSheet, View } from 'react-native';

import { QuickActionCard } from '@/components/QuickActionCard';

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
      <QuickActionCard
        description="Solicita una nueva cita en línea."
        icon="calendar-plus"
        onPress={() => navigate('requestAppointment', onRequestAppointment)}
        title="Solicitar cita"
      />
      <QuickActionCard
        description="Resumen de consultas y diagnosticos."
        icon="clipboard-pulse-outline"
        onPress={() => navigate('history', onHistory)}
        title="Historial"
      />
      <QuickActionCard
        description="Medicamentos e indicaciones medicas."
        icon="pill"
        onPress={() => navigate('prescriptions', onPrescriptions)}
        title="Recetas"
      />
      <QuickActionCard
        description="Laboratorio, imagenes y solicitudes."
        icon="clipboard-text-outline"
        onPress={() => navigate('medicalOrders', onMedicalOrders)}
        title="Ordenes"
      />
      <QuickActionCard
        description="Facturas, pagos y saldos."
        icon="receipt-text-outline"
        onPress={() => navigate('invoices', onInvoices)}
        title="Facturas"
      />
      <QuickActionCard
        description="Historial de pagos aplicados."
        icon="cash-check"
        onPress={() => navigate('payments', onPayments)}
        title="Pagos"
      />
      <QuickActionCard
        description="Documentos clínicos visibles."
        icon="file-document-outline"
        onPress={() => navigate('documents', onDocuments)}
        title="Documentos"
      />
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
