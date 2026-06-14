import { StyleSheet, View } from 'react-native';

import { QuickActionCard } from '@/components/QuickActionCard';

interface PatientQuickActionsProps {
  onAppointments?: () => void;
  onDocuments?: () => void;
  onInvoices?: () => void;
  onNavigate?: (target: 'appointments' | 'documents' | 'invoices' | 'prescriptions' | 'profile' | 'requestAppointment') => void;
  onPrescriptions?: () => void;
  onProfile?: () => void;
  onRequestAppointment?: () => void;
}

export function PatientQuickActions({
  onAppointments,
  onDocuments,
  onInvoices,
  onNavigate,
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
        description="Medicamentos e indicaciones medicas."
        icon="pill"
        onPress={() => navigate('prescriptions', onPrescriptions)}
        title="Recetas"
      />
      <QuickActionCard
        description="Facturas, pagos y saldos."
        icon="receipt-text-outline"
        onPress={() => navigate('invoices', onInvoices)}
        title="Facturas"
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
