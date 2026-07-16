import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { toPositiveId } from '@/core/utils/idUtils';
import { InvoiceCard } from '@/features/cashier/components/InvoiceCard';
import { getPendingInvoices } from '@/features/cashier/services/cashierInvoiceService';
import type { CashierInvoice } from '@/features/cashier/types/cashierInvoice.types';
import { colors } from '@/core/theme/colors';
import { TodayAdmissionCard } from '@/features/reception/components/TodayAdmissionCard';
import { getTodayAdmissions } from '@/features/reception/services/receptionAdmissionService';
import { patientIdentity, patientName, patientPhone } from '@/features/reception/services/receptionMappers';
import { getPatientDetail } from '@/features/reception/services/receptionPatientService';
import type { ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';
import type { ReceptionPatient } from '@/features/reception/types/receptionPatient.types';

export function ReceptionPatientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const patientId = toPositiveId(route.params?.patientId);
  const [patient, setPatient] = useState<ReceptionPatient | null>(null);
  const [pendingInvoices, setPendingInvoices] = useState<CashierInvoice[]>([]);
  const [todayVisits, setTodayVisits] = useState<ReceptionVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) {
      setPatient(null);
      setError('No se encontró el paciente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [patientData, invoices, visits] = await Promise.all([
        getPatientDetail(patientId),
        getPendingInvoices({ patient: patientId, patient_id: patientId }).catch(() => []),
        getTodayAdmissions({ patient: patientId, patient_id: patientId }).catch(() => []),
      ]);
      setPatient(patientData);
      setPendingInvoices(invoices);
      setTodayVisits(visits.filter((visit) => toPositiveId(visit.patient_id ?? visit.patient) === patientId || !visit.patient_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el paciente.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const alerts = useMemo(() => patient ? buildPatientAlerts(patient, pendingInvoices, todayVisits) : [], [patient, pendingInvoices, todayVisits]);

  if (loading) return <LoadingState label="Cargando paciente..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="account-outline" subtitle="Perfil rápido para recepción." title="Paciente" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
        {!error && !patient ? <EmptyState title="Paciente no disponible" /> : null}
        {patient ? (
          <>
            <AppCard style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.avatar}>
                  <MaterialCommunityIcons color={colors.white} name="account" size={28} />
                </View>
                <View style={styles.headerCopy}>
                  <Text style={styles.title}>{patientName(patient)}</Text>
                  <Text style={styles.meta}>{patient.patient_code ?? patient.codigo_paciente ?? patient.medical_record_number ?? 'Sin código'}</Text>
                </View>
              </View>
              <Info label="Identidad" value={patientIdentity(patient)} />
              <Info label="Teléfono" value={patientPhone(patient)} />
              <Info label="Edad" value={String(patient.age ?? patient.edad ?? 'No registrada')} />
              <Info label="Sexo" value={patient.gender ?? patient.genero ?? 'No registrado'} />
              <Info label="Dirección" value={patient.address ?? patient.direccion ?? 'No registrada'} />
              <Info label="Correo" value={patient.email ?? patient.correo ?? 'No registrado'} />
            </AppCard>

            {alerts.length ? (
              <AppCard style={styles.card}>
                <Text style={styles.section}>Alertas para recepción</Text>
                {alerts.map((alert) => <Text key={alert} style={styles.alert}>{alert}</Text>)}
              </AppCard>
            ) : null}

            <View style={styles.actions}>
              <AppButton label="Crear admisión" onPress={() => navigation.navigate('ReceptionCreateAdmission', { patient, patientId: patient.id })} />
              <AppButton label="Buscar en caja" onPress={() => navigation.navigate('ReceptionCashierTab', { screen: 'CashierInvoiceSearch' })} variant="secondary" />
              <AppButton label="Admisiones de hoy" onPress={() => navigation.navigate('ReceptionTodayAdmissions', { initialSearch: patientName(patient) })} variant="secondary" />
            </View>

            <Text style={styles.section}>Facturas pendientes</Text>
            {pendingInvoices.length ? pendingInvoices.slice(0, 3).map((invoice) => (
              <InvoiceCard
                invoice={invoice}
                key={invoice.id ?? invoice.invoice_number}
                onPay={() => invoice.id ? navigation.navigate('ReceptionCashierTab', { screen: 'CashierRegisterPayment', params: { invoiceId: invoice.id } }) : undefined}
                onPress={() => invoice.id ? navigation.navigate('ReceptionCashierTab', { screen: 'CashierInvoiceDetail', params: { invoiceId: invoice.id } }) : undefined}
              />
            )) : <EmptyState description="No se encontraron saldos pendientes." title="Sin facturas pendientes" />}

            <Text style={styles.section}>Visitas de hoy</Text>
            {todayVisits.length ? todayVisits.slice(0, 4).map((visit) => (
              <TodayAdmissionCard key={visit.id} onPress={() => navigation.navigate('ReceptionVisitDetail', { visitId: visit.id })} visit={visit} />
            )) : <EmptyState description="El paciente no tiene admisiones registradas hoy." title="Sin visitas de hoy" />}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildPatientAlerts(patient: ReceptionPatient, invoices: CashierInvoice[], visits: ReceptionVisit[]) {
  const alerts: string[] = [];
  if (patient.allergies || patient.alergias) alerts.push(`Alergias: ${patient.allergies ?? patient.alergias}`);
  if (patient.chronic_diseases) alerts.push(`Condiciones cronicas: ${patient.chronic_diseases}`);
  if (patientIdentity(patient) === 'Sin identidad') alerts.push('Identidad pendiente de completar.');
  if (patientPhone(patient) === 'Sin teléfono') alerts.push('Teléfono pendiente de completar.');
  if (invoices.length) alerts.push(`Tiene ${invoices.length} factura(s) pendiente(s).`);
  if (visits.length) alerts.push('Ya tiene una visita registrada hoy.');
  return alerts;
}

function Info({ label, value }: { label: string; value: string }) {
  return <Text style={styles.meta}>{label}: {value}</Text>;
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  alert: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 12, borderWidth: 1, color: colors.warning, fontSize: 13, fontWeight: '800', lineHeight: 19, padding: 10 },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, height: 52, justifyContent: 'center', width: 52 },
  card: { gap: 9 },
  content: { gap: 14, padding: 18, paddingBottom: 140 },
  headerCopy: { flex: 1 },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  safe: { backgroundColor: colors.background, flex: 1 },
  section: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
});
