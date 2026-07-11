import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { QuickActionCard } from '@/components/QuickActionCard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppointmentCheckInCard } from '@/features/reception/components/AppointmentCheckInCard';
import { ReceptionStatsGrid } from '@/features/reception/components/ReceptionStatsGrid';
import { TodayAdmissionCard } from '@/features/reception/components/TodayAdmissionCard';
import { getTodayAdmissions } from '@/features/reception/services/receptionAdmissionService';
import { getTodayAppointments } from '@/features/reception/services/receptionAppointmentService';
import { getReceptionDashboard } from '@/features/reception/services/receptionDashboardService';
import type { ReceptionStats, ReceptionVisit } from '@/features/reception/types/receptionAdmission.types';
import type { ReceptionAppointment } from '@/features/reception/types/receptionAppointment.types';

export function ReceptionDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [stats, setStats] = useState<ReceptionStats | null>(null);
  const [admissions, setAdmissions] = useState<ReceptionVisit[]>([]);
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [dashboardStats, todayAdmissions, todayAppointments] = await Promise.all([
        getReceptionDashboard().catch(() => null),
        getTodayAdmissions().catch(() => []),
        getTodayAppointments().catch(() => []),
      ]);
      setStats(dashboardStats);
      setAdmissions(todayAdmissions);
      setAppointments(todayAppointments);
      if (!dashboardStats && todayAdmissions.length === 0 && todayAppointments.length === 0) {
        setError('No se pudo cargar la información operativa de recepción.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar recepción.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const work = useMemo(() => buildWorkSummary(admissions, appointments), [admissions, appointments]);
  const priorityAdmissions = useMemo(() => admissions.filter((item) => isPriority(item)).slice(0, 3), [admissions]);
  const nextAppointments = useMemo(() => appointments.filter((item) => !appointmentIsCheckedIn(item)).slice(0, 3), [appointments]);

  function runQuickSearch() {
    const value = quickSearch.trim();
    navigation.navigate('ReceptionPatientSearch', value.length >= 2 ? { initialQuery: value } : undefined);
  }

  if (loading) return <LoadingState label="Cargando recepción..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="desk" subtitle={`${user?.clinica_nombre ?? 'Clínica asignada'} - ${user?.nombre_completo ?? 'Recepción'}`} title="Centro de recepción" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="Panel incompleto" /> : null}

        <AppCard style={styles.searchCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Búsqueda rápida</Text>
              <Text style={styles.sectionMeta}>Nombre, identidad, teléfono o código.</Text>
            </View>
            <MaterialCommunityIcons color={colors.primary} name="account-search-outline" size={26} />
          </View>
          <AppInput autoCapitalize="words" label="Paciente" onChangeText={setQuickSearch} onSubmitEditing={runQuickSearch} placeholder="Buscar paciente" value={quickSearch} />
          <View style={styles.rowButtons}>
            <AppButton label="Buscar" onPress={runQuickSearch} />
            <AppButton label="Nuevo" onPress={() => navigation.navigate('ReceptionPatientCreate')} variant="secondary" />
          </View>
        </AppCard>

        {stats ? <ReceptionStatsGrid stats={stats} /> : null}

        <Text style={styles.sectionTitle}>Bandeja operativa</Text>
        <View style={styles.workflowGrid}>
          <WorkflowCard count={work.pendingCheckIn} icon="calendar-clock" label="Citas por recibir" onPress={() => navigation.navigate('ReceptionAppointmentCheckIn', { initialFilter: 'scheduled' })} tone="blue" />
          <WorkflowCard count={work.waitingTriage} icon="clipboard-pulse-outline" label="Esperando triaje" onPress={() => navigation.navigate('ReceptionTodayAdmissions', { initialFilter: 'waiting_triage' })} tone="warning" />
          <WorkflowCard count={work.waitingDoctor} icon="doctor" label="Listos para médico" onPress={() => navigation.navigate('ReceptionTodayAdmissions', { initialFilter: 'waiting_doctor' })} tone="primary" />
          <WorkflowCard count={work.waitingBilling} icon="cash-register" label="Pendiente caja" onPress={() => navigation.navigate('ReceptionTodayAdmissions', { initialFilter: 'waiting_billing' })} tone="danger" />
        </View>

        <Text style={styles.sectionTitle}>Acciones frecuentes</Text>
        <View style={styles.actions}>
          <QuickActionCard description="Busca, valida identidad y abre expediente operativo." icon="account-search-outline" onPress={() => navigation.navigate('ReceptionPatientSearch')} title="Buscar paciente" />
          <QuickActionCard description="Registra un paciente mínimo para atención inmediata." icon="account-plus-outline" onPress={() => navigation.navigate('ReceptionPatientCreate')} title="Crear paciente" />
          <QuickActionCard description="Crea una visita sin cita y asigna prioridad/médico." icon="clipboard-plus-outline" onPress={() => navigation.navigate('ReceptionCreateAdmission')} title="Nueva admisión" />
          <QuickActionCard description="Recibe pacientes con cita y crea la visita operativa." icon="calendar-check-outline" onPress={() => navigation.navigate('ReceptionAppointmentCheckIn')} title="Check-in de cita" />
          <QuickActionCard description="CRUD temporal de examen con nombre, fecha de cumpleaños y teléfono." icon="cake-variant-outline" onPress={() => navigation.navigate('BirthdayExam')} title="Cumpleaños" />
        </View>

        <SectionHeader action="Ver agenda" onPress={() => navigation.navigate('ReceptionAppointmentCheckIn')} title="Proximas citas" />
        {nextAppointments.length ? nextAppointments.map((appointment) => (
          <AppointmentCheckInCard
            appointment={appointment}
            key={appointment.id ?? `${appointment.patient_name}-${appointment.time}`}
            onCheckIn={() => navigation.navigate('ReceptionAppointmentCheckIn', { focusAppointmentId: appointment.id })}
            onViewVisit={() => navigation.navigate('ReceptionAppointmentCheckIn')}
          />
        )) : <EmptyState description="No hay citas pendientes por recibir." title="Agenda al día" />}

        <SectionHeader action="Ver flujo" onPress={() => navigation.navigate('ReceptionTodayAdmissions')} title="Prioridades de atención" />
        {priorityAdmissions.length ? priorityAdmissions.map((visit) => (
          <TodayAdmissionCard key={visit.id} onPress={() => navigation.navigate('ReceptionVisitDetail', { visitId: visit.id })} visit={visit} />
        )) : <EmptyState description="No hay pacientes urgentes o atrasados en este momento." title="Sin prioridades" />}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ action, onPress, title }: { action: string; onPress: () => void; title: string }) {
  return (
    <View style={styles.listHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text onPress={onPress} style={styles.link}>{action}</Text>
    </View>
  );
}

function WorkflowCard({
  count,
  icon,
  label,
  onPress,
  tone,
}: {
  count: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  tone: 'primary' | 'blue' | 'warning' | 'danger';
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.workflowCard, pressed && styles.pressed]}>
      <View style={[styles.workflowIcon, styles[tone]]}>
        <MaterialCommunityIcons color={colors.white} name={icon} size={20} />
      </View>
      <Text style={styles.workflowCount}>{count}</Text>
      <Text style={styles.workflowLabel}>{label}</Text>
    </Pressable>
  );
}

function buildWorkSummary(admissions: ReceptionVisit[], appointments: ReceptionAppointment[]) {
  return {
    pendingCheckIn: appointments.filter((item) => !appointmentIsCheckedIn(item) && !String(item.status ?? '').toLowerCase().includes('cancel')).length,
    waitingBilling: admissions.filter((item) => normalizeVisitStatus(item) === 'waiting_billing').length,
    waitingDoctor: admissions.filter((item) => normalizeVisitStatus(item) === 'waiting_doctor').length,
    waitingTriage: admissions.filter((item) => normalizeVisitStatus(item) === 'waiting_triage').length,
  };
}

function normalizeVisitStatus(visit: ReceptionVisit) {
  const status = String(visit.status ?? '').toLowerCase();
  if (status.includes('billing') || status.includes('payment') || status.includes('caja') || status.includes('pago')) return 'waiting_billing';
  if (status.includes('doctor') || status.includes('medic')) return 'waiting_doctor';
  if (status.includes('triage') || status.includes('triaje') || status === 'registered') return 'waiting_triage';
  return status;
}

function isPriority(visit: ReceptionVisit) {
  const priority = String(visit.priority ?? '').toLowerCase();
  return ['urgent', 'emergency', 'priority', 'alta', 'emergencia', 'urgente'].some((value) => priority.includes(value)) || ['waiting_triage', 'waiting_doctor', 'waiting_billing'].includes(normalizeVisitStatus(visit));
}

function appointmentIsCheckedIn(appointment: ReceptionAppointment) {
  const status = String(appointment.status ?? '').toLowerCase();
  return Boolean(appointment.checked_in || appointment.visit_id || appointment.admission_id || appointment.check_in_visit_id || status.includes('check') || status.includes('attended'));
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  blue: { backgroundColor: colors.medicalBlue },
  content: { gap: 16, padding: 18, paddingBottom: 140 },
  danger: { backgroundColor: colors.danger },
  link: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  primary: { backgroundColor: colors.primary },
  rowButtons: { flexDirection: 'row', gap: 10 },
  safe: { backgroundColor: colors.background, flex: 1 },
  searchCard: { gap: 12 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionMeta: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  warning: { backgroundColor: colors.warning },
  workflowCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexBasis: '47%', flexGrow: 1, gap: 6, padding: 14 },
  workflowCount: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  workflowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  workflowIcon: { alignItems: 'center', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  workflowLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', lineHeight: 17 },
});
