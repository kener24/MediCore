import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { ClinicalRiskBanner } from '@/features/doctor/components/ClinicalRiskBanner';
import { MedicalBackgroundCard } from '@/features/doctor/components/MedicalBackgroundCard';
import { PatientSummaryCard } from '@/features/doctor/components/PatientSummaryCard';
import { RecentClinicalInfoSection } from '@/features/doctor/components/RecentClinicalInfoSection';
import { TriageSummaryCard } from '@/features/doctor/components/TriageSummaryCard';
import { VisitInfoCard } from '@/features/doctor/components/VisitInfoCard';
import { VitalSignsCard } from '@/features/doctor/components/VitalSignsCard';
import {
  getPatientMedicalSummary,
  getPatientSummary,
  getVisitDetail,
  getVisitTriage,
  getVisitVitalSigns,
  startConsultation,
} from '@/features/doctor/services/doctorPatientService';
import type { DoctorAppointment } from '@/features/doctor/types/doctorSchedule.types';
import type {
  DoctorPatientBasicInfo,
  DoctorPatientMedicalSummary,
  DoctorTriageInfo,
  DoctorVisitDetail,
  DoctorVitalSigns,
} from '@/features/doctor/types/doctorPatient.types';
import type { WaitingRoomPatient } from '@/features/doctor/types/doctorWaitingRoom.types';

type RouteParams = {
  appointment?: DoctorAppointment;
  appointmentId?: number;
  item?: WaitingRoomPatient;
  patient?: DoctorPatientBasicInfo;
  patientId?: number;
  visitId?: number | null;
};

const STARTABLE_STATUSES = [
  'waiting',
  'waiting_doctor',
  'checked_in',
  'ready_for_doctor',
  'in_triage_completed',
  'triage_completed',
  'pendiente',
  'en_espera',
  'listo',
];

const ACTIVE_STATUSES = ['in_progress', 'in_consultation', 'en_consulta', 'atendiendo'];

export function DoctorPatientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as RouteParams, [route.params]);
  const initialVisitId = params.visitId ?? params.item?.visit_id ?? params.item?.visita_id ?? params.appointment?.visit_id ?? params.appointment?.visita_id;
  const initialPatientId = params.patientId ?? params.item?.patient_id ?? params.item?.paciente_id ?? params.appointment?.patient_id;

  const [patient, setPatient] = useState<DoctorPatientBasicInfo | null>(
    params.patient ?? (params.item?.patient as DoctorPatientBasicInfo | undefined) ?? buildPatientFromParams(params) ?? null,
  );
  const [visit, setVisit] = useState<Partial<DoctorVisitDetail> | null>(buildVisitFromParams(params));
  const [vitalSigns, setVitalSigns] = useState<DoctorVitalSigns | null>(
    (params.item?.vital_signs as DoctorVitalSigns | undefined) ?? null,
  );
  const [triage, setTriage] = useState<DoctorTriageInfo | null>(null);
  const [medicalSummary, setMedicalSummary] = useState<DoctorPatientMedicalSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(initialVisitId || initialPatientId));
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!initialVisitId && !initialPatientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [visitData, vitalsData, triageData] = await Promise.all([
        initialVisitId ? getVisitDetail(initialVisitId).catch(() => null) : Promise.resolve(null),
        initialVisitId ? getVisitVitalSigns(initialVisitId).catch(() => null) : Promise.resolve(null),
        initialVisitId ? getVisitTriage(initialVisitId).catch(() => null) : Promise.resolve(null),
      ]);

      const resolvedPatientId =
        initialPatientId ??
        visitData?.patient_id ??
        visitData?.paciente_id ??
        visitData?.patient?.id;

      const [patientData, medicalData] = await Promise.all([
        resolvedPatientId ? getPatientSummary(resolvedPatientId).catch(() => null) : Promise.resolve(null),
        resolvedPatientId ? getPatientMedicalSummary(resolvedPatientId).catch(() => null) : Promise.resolve(null),
      ]);

      const nextVisit = visitData ?? buildVisitFromParams(params);
      setVisit(nextVisit);
      setPatient(
        mergePatient(
          patientData,
          nextVisit?.patient,
          params.patient,
          params.item?.patient as DoctorPatientBasicInfo | undefined,
          buildPatientFromParams(params),
        ),
      );
      setVitalSigns(vitalsData ?? triageData?.vital_signs ?? (params.item?.vital_signs as DoctorVitalSigns | undefined) ?? null);
      setTriage(triageData);
      setMedicalSummary(medicalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información del paciente.');
    } finally {
      setLoading(false);
    }
  }, [initialPatientId, initialVisitId, params]);

  useEffect(() => {
    load();
  }, [load]);

  const resolvedVisitId = useMemo(() => {
    return initialVisitId ?? visit?.visit_id ?? visit?.id ?? null;
  }, [initialVisitId, visit?.id, visit?.visit_id]);

  const resolvedPatientId = useMemo(() => {
    return initialPatientId ?? patient?.id ?? visit?.patient_id ?? visit?.paciente_id ?? visit?.patient?.id;
  }, [initialPatientId, patient?.id, visit?.paciente_id, visit?.patient?.id, visit?.patient_id]);

  const status = String(visit?.status ?? visit?.estado ?? params.item?.status ?? params.item?.estado ?? '').toLowerCase();
  const canStart = Boolean(resolvedVisitId && (STARTABLE_STATUSES.includes(status) || !status));
  const isActive = ACTIVE_STATUSES.includes(status);
  const actionLabel = isActive ? 'Continuar consulta' : 'Iniciar consulta';

  async function handleConsultationAction() {
    if (!resolvedVisitId) {
      Alert.alert('Consulta', 'No se puede iniciar consulta sin una visita asociada.');
      return;
    }
    if (isActive) {
      navigation.navigate('DoctorConsultation', {
        consultationId: visit?.consultation_id ?? undefined,
        patient,
        patientId: resolvedPatientId,
        visitId: resolvedVisitId,
      });
      return;
    }
    Alert.alert('Iniciar consulta', 'Deseas iniciar la consulta de este paciente?', [
      { style: 'cancel', text: 'Cancelar' },
      {
        onPress: async () => {
          setStarting(true);
          try {
            const response = await startConsultation(resolvedVisitId);
            const consultationId = response.consultation_id ?? response.id ?? visit?.consultation_id ?? undefined;
            navigation.navigate('DoctorConsultation', {
              consultationId,
              patient,
              patientId: resolvedPatientId,
              visitId: resolvedVisitId,
            });
          } catch (err) {
            Alert.alert('Consulta', err instanceof Error ? err.message : 'No se pudo iniciar la consulta.');
          } finally {
            setStarting(false);
          }
        },
        text: 'Iniciar',
      },
    ]);
  }

  if (loading) return <LoadingState label="Cargando paciente..." />;
  if (error) return <ErrorState message={error} onRetry={load} title="No se pudo cargar el paciente" />;

  if (!patient && !visit && !params.item && !params.appointment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <DoctorHeader title="Detalle del paciente" />
          <EmptyState
            description="No se encontró información suficiente para abrir este paciente."
            title="Paciente no disponible"
          />
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Detalle del paciente" />
        <PatientSummaryCard patient={patient} />
        <ClinicalRiskBanner medicalSummary={medicalSummary} />
        <VisitInfoCard visit={visit} />
        <VitalSignsCard vitalSigns={vitalSigns} />
        <TriageSummaryCard triage={triage} visit={visit} />
        <MedicalBackgroundCard medicalSummary={medicalSummary} />
        <RecentClinicalInfoSection medicalSummary={medicalSummary} />
        <AppButton
          label="Ver triaje completo"
          onPress={() =>
            navigation.navigate('DoctorTriageDetail', {
              item: params.item,
              triage,
              visit,
              visitId: resolvedVisitId,
              vitalSigns,
            })
          }
          variant="secondary"
        />
        <AppButton
          disabled={!canStart && !isActive}
          label={actionLabel}
          loading={starting}
          onPress={handleConsultationAction}
        />
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function buildPatientFromParams(params: RouteParams): DoctorPatientBasicInfo | null {
  const item = params.item;
  const appointment = params.appointment;
  if (!item && !appointment) return null;
  return {
    age: item?.age ?? item?.edad ?? appointment?.patient_age,
    full_name:
      item?.patient_name ??
      item?.paciente_nombre ??
      appointment?.patient_name ??
      appointment?.patient_nombre ??
      appointment?.paciente_nombre,
    gender: item?.gender ?? item?.genero ?? appointment?.patient_gender,
    id: item?.patient_id ?? item?.paciente_id ?? appointment?.patient_id ?? appointment?.patient,
    patient_code: appointment?.patient_codigo,
  };
}

function buildVisitFromParams(params: RouteParams): Partial<DoctorVisitDetail> | null {
  if (params.item) {
    return {
      arrived_at: params.item.arrived_at ?? params.item.llegada_en,
      id: params.item.visit_id ?? params.item.visita_id ?? params.item.id,
      patient_id: params.item.patient_id ?? params.item.paciente_id,
      patient_name: params.item.patient_name ?? params.item.paciente_nombre,
      priority: params.item.priority ?? params.item.prioridad,
      reason: params.item.reason ?? params.item.motivo,
      status: params.item.status ?? params.item.estado,
      triage_completed: params.item.triage_completed ?? params.item.triaje_completado,
      visit_type: params.item.visit_type ?? params.item.tipo_visita,
    };
  }
  if (params.appointment) {
    return {
      appointment_id: params.appointment.appointment_id ?? params.appointment.id,
      id: params.appointment.visit_id ?? params.appointment.visita_id ?? params.appointment.id,
      patient_id: params.appointment.patient_id ?? params.appointment.patient,
      patient_name: params.appointment.patient_name ?? params.appointment.patient_nombre ?? params.appointment.paciente_nombre,
      reason: params.appointment.reason ?? params.appointment.motivo,
      status: params.appointment.status ?? params.appointment.estado,
      visit_id: params.appointment.visit_id ?? params.appointment.visita_id ?? undefined,
    };
  }
  return params.visitId ? { id: params.visitId } : null;
}

function mergePatient(
  ...values: (DoctorPatientBasicInfo | null | undefined)[]
): DoctorPatientBasicInfo | null {
  const filled = values.filter(Boolean) as DoctorPatientBasicInfo[];
  if (!filled.length) return null;
  return filled.reduce((acc, item) => ({ ...acc, ...item }), {});
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 118 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
