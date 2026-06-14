import { StyleSheet, View } from 'react-native';

import { QuickActionCard } from '@/components/QuickActionCard';

interface PatientQuickActionsProps {
  onAppointments: () => void;
  onDocuments: () => void;
  onInvoices: () => void;
  onPrescriptions: () => void;
  onProfile: () => void;
  onRequestAppointment: () => void;
}

export function PatientQuickActions({
  onAppointments,
  onDocuments,
  onInvoices,
  onPrescriptions,
  onProfile,
  onRequestAppointment,
}: PatientQuickActionsProps) {
  return (
    <View style={styles.container}>
      <QuickActionCard
        description="Consulta tus proximas citas e historial."
        icon="calendar-check-outline"
        onPress={onAppointments}
        title="Mis citas"
      />
      <QuickActionCard
        description="Solicita una nueva cita en linea."
        icon="calendar-plus"
        onPress={onRequestAppointment}
        title="Solicitar cita"
      />
      <QuickActionCard
        description="Medicamentos e indicaciones medicas."
        icon="pill"
        onPress={onPrescriptions}
        title="Recetas"
      />
      <QuickActionCard
        description="Facturas, pagos y saldos."
        icon="receipt-text-outline"
        onPress={onInvoices}
        title="Facturas"
      />
      <QuickActionCard
        description="Documentos clinicos visibles."
        icon="file-document-outline"
        onPress={onDocuments}
        title="Documentos"
      />
      <QuickActionCard
        description="Datos personales y contacto de emergencia."
        icon="account-circle-outline"
        onPress={onProfile}
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
