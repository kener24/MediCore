import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/moneyUtils';
import { subscribeToPushNotificationResponses } from '@/core/notifications/pushNotificationService';
import { NextAppointmentCard } from '@/features/patient/components/NextAppointmentCard';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { PatientQuickActions } from '@/features/patient/components/PatientQuickActions';
import { PatientStatsGrid } from '@/features/patient/components/PatientStatsGrid';
import { PendingInvoicesSection } from '@/features/patient/components/PendingInvoicesSection';
import { RecentDocumentsSection } from '@/features/patient/components/RecentDocumentsSection';
import { RecentNotificationsSection } from '@/features/patient/components/RecentNotificationsSection';
import { RecentPrescriptionsSection } from '@/features/patient/components/RecentPrescriptionsSection';
import { getPatientDashboard } from '@/features/patient/services/patientDashboardService';
import { markPatientNotificationRead } from '@/features/patient/services/patientNotificationsService';
import type { NormalizedPatientDashboard } from '@/features/patient/types/patientDashboard.types';

export function PatientDashboardScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [dashboard, setDashboard] = useState<NormalizedPatientDashboard | null>(null);
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
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu información.');
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

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    void subscribeToPushNotificationResponses((data) => {
      if (data.notificationId) void markPatientNotificationRead(data.notificationId).catch(() => undefined);
      const id = Number(data.relatedObjectId);
      if (!Number.isFinite(id) || id <= 0) return;
      const model = String(data.relatedModel || '').toLowerCase();
      if (model === 'appointment') navigation.getParent()?.navigate('PatientAppointmentsTab', { screen: 'PatientAppointmentDetail', params: { id } });
      if (model === 'clinicaldocument') navigation.getParent()?.navigate('PatientDocumentsTab', { screen: 'PatientDocumentDetail', params: { id } });
      if (model === 'invoice') navigation.navigate('PatientInvoiceDetail', { id });
      if (model === 'payment') navigation.navigate('PatientPaymentDetail', { id });
      if (model === 'prescription') navigation.navigate('PatientPrescriptionDetail', { id });
      if (model === 'medicalorder') navigation.navigate('PatientMedicalOrderDetail', { id });
    }).then((cleanup) => { unsubscribe = cleanup; });
    return () => unsubscribe();
  }, [navigation]);

  function navigateQuickAction(
    target: 'appointments' | 'creditNotes' | 'documents' | 'history' | 'invoices' | 'medicalOrders' | 'payments' | 'prescriptions' | 'profile' | 'requestAppointment',
  ) {
    if (target === 'appointments') navigation.getParent()?.navigate('PatientAppointmentsTab');
    if (target === 'creditNotes') navigation.navigate('PatientCreditNotes');
    if (target === 'documents') navigation.getParent()?.navigate('PatientDocumentsTab');
    if (target === 'history') navigation.navigate('PatientMedicalHistory');
    if (target === 'invoices') navigation.navigate('PatientInvoices');
    if (target === 'medicalOrders') navigation.navigate('PatientMedicalOrders');
    if (target === 'payments') navigation.navigate('PatientPayments');
    if (target === 'prescriptions') navigation.navigate('PatientPrescriptions');
    if (target === 'profile') navigation.getParent()?.navigate('PatientProfileTab');
    if (target === 'requestAppointment') navigation.navigate('RequestAppointment');
  }

  if (loading) return <LoadingState label="Cargando tu dashboard..." />;

  const hasAnyData =
    Boolean(dashboard?.patientName) ||
    Boolean(dashboard?.nextAppointment) ||
    Boolean(dashboard?.recentPrescriptions.length) ||
    Boolean(dashboard?.pendingInvoices.length) ||
    Boolean(dashboard?.recentDocuments.length) ||
    Boolean(dashboard?.recentNotifications.length);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => load(true)}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ErrorState
            message={`${error} Revisa tu conexión e intenta de nuevo.`}
            onRetry={() => load()}
            title="No se pudo cargar tu información"
          />
        ) : dashboard && hasAnyData ? (
          <>
            <PatientHeader
              clinicName={dashboard.clinicName}
              onNotificationsPress={() => navigation.getParent()?.navigate('PatientNotificationsTab')}
              patientName={dashboard.patientName}
              subtitle={dashboard.clinicName ? 'Bienvenido a MediCore' : undefined}
              unreadCount={dashboard.stats.unreadNotifications}
            />

            <NextAppointmentCard
              appointment={dashboard.nextAppointment}
              onRequestAppointment={() => navigation.navigate('RequestAppointment')}
              onViewDetail={() => {
                if (dashboard.nextAppointment?.id) {
                  navigation.navigate('PatientAppointmentDetail', { id: dashboard.nextAppointment.id });
                }
              }}
            />

            <PatientStatsGrid stats={dashboard.stats} />

            <AppCard style={styles.financeCard}>
              <Text style={styles.financeTitle}>Resumen financiero</Text>
              <Text style={styles.financeBalance}>Saldo pendiente: {formatCurrency(dashboard.pendingBalance)}</Text>
              <Text style={styles.financeMeta}>{dashboard.lastPayment ? `Último pago: ${dashboard.lastPayment.payment_number || `#${dashboard.lastPayment.id}`} · ${formatCurrency(dashboard.lastPayment.amount)}` : 'Aún no tienes pagos registrados.'}</Text>
            </AppCard>

            <PatientQuickActions onNavigate={navigateQuickAction} permissions={dashboard.permissions} />

            <RecentPrescriptionsSection
              items={dashboard.recentPrescriptions}
              onPressItem={(id) => navigation.navigate('PatientPrescriptionDetail', { id })}
            />

            <PendingInvoicesSection
              currency={dashboard.currency}
              items={dashboard.pendingInvoices}
              onPressItem={(id) => navigation.navigate('PatientInvoiceDetail', { id })}
            />

            <RecentDocumentsSection
              items={dashboard.recentDocuments}
              onPressItem={(id) => navigation.navigate('PatientDocumentDetail', { id })}
            />

            <RecentNotificationsSection items={dashboard.recentNotifications} />
          </>
        ) : (
          <EmptyState
            description="No tienes datos disponibles todavía. Cuando tu clínica registre citas, recetas, documentos o facturas aparecerán aquí."
            title="No tienes datos disponibles todavía"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 34,
  },
  financeBalance: { color: colors.primaryDark, fontSize: 18, fontWeight: '900' },
  financeCard: { gap: 6 },
  financeMeta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  financeTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
