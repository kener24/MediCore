import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';
import { AppointmentCard } from '@/features/patient/components/AppointmentCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { PatientQuickActions } from '@/features/patient/components/PatientQuickActions';
import { PrescriptionCard } from '@/features/patient/components/PrescriptionCard';
import { getPatientDashboard } from '@/features/patient/services/patientDashboardService';
import type { PatientDashboard } from '@/features/patient/types/patientDashboard.types';

export function PatientDashboardScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [dashboard, setDashboard] = useState<PatientDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setDashboard(await getPatientDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <LoadingState label="Cargando portal paciente..." />;

  const nextAppointment = dashboard?.next_appointment || dashboard?.upcoming_appointments?.[0];
  const unread = dashboard?.unread_notifications ?? dashboard?.unread_notifications_count ?? 0;
  const pendingInvoices = dashboard?.pending_invoices?.length ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader
          name={dashboard?.patient?.nombre_completo}
          subtitle={dashboard?.clinic?.nombre || 'Portal de paciente'}
        />

        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el dashboard" />
        ) : dashboard ? (
          <>
            <View style={styles.stats}>
              <StatCard icon="bell-outline" label="Notificaciones" tone="blue" value={String(unread)} />
              <StatCard icon="receipt-text-outline" label="Facturas pendientes" tone="warning" value={String(pendingInvoices)} />
            </View>

            <SectionTitle title="Proxima cita" />
            {nextAppointment ? (
              <AppointmentCard
                appointment={nextAppointment}
                onPress={() =>
                  navigation.navigate('PatientAppointmentDetail', { id: nextAppointment.id })
                }
              />
            ) : (
              <EmptyState
                description="No tienes citas proximas registradas."
                title="Sin proxima cita"
              />
            )}

            <SectionTitle title="Accesos rapidos" />
            <PatientQuickActions
              onAppointments={() => navigation.getParent()?.navigate('PatientAppointmentsTab')}
              onDocuments={() => navigation.getParent()?.navigate('PatientDocumentsTab')}
              onInvoices={() => navigation.navigate('PatientInvoices')}
              onPrescriptions={() => navigation.navigate('PatientPrescriptions')}
              onProfile={() => navigation.getParent()?.navigate('PatientProfileTab')}
              onRequestAppointment={() => navigation.navigate('RequestAppointment')}
            />

            <SectionTitle title="Recetas recientes" />
            {dashboard.recent_prescriptions?.length ? (
              <View style={styles.list}>
                {dashboard.recent_prescriptions.slice(0, 3).map((prescription) => (
                  <PrescriptionCard
                    key={prescription.id}
                    prescription={prescription}
                    onPress={() =>
                      navigation.navigate('PatientPrescriptionDetail', { id: prescription.id })
                    }
                  />
                ))}
              </View>
            ) : (
              <EmptyState description="No hay recetas recientes visibles." title="Sin recetas recientes" />
            )}
          </>
        ) : (
          <EmptyState description="No hay informacion disponible." title="Dashboard vacio" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 22,
    paddingBottom: 34,
  },
  list: {
    gap: 12,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
});
