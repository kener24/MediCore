import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';
import { ConsultationForm } from '@/features/doctor/components/ConsultationForm';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { PatientSummaryCard } from '@/features/doctor/components/PatientSummaryCard';
import {
  completeConsultation,
  createConsultation,
  startConsultation,
  updateConsultation,
} from '@/features/doctor/services/doctorConsultationService';
import type {
  ConsultationPayload,
  DoctorConsultation,
  DoctorPatientSummary,
} from '@/features/doctor/types/doctorConsultation.types';

export function DoctorConsultationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as {
    consultationId?: number;
    patient?: DoctorPatientSummary;
    visitId?: number;
  };
  const [consultation, setConsultation] = useState<DoctorConsultation | null>(null);
  const [form, setForm] = useState<ConsultationPayload>({});
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  function updateField(field: keyof ConsultationPayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    if (!form.chief_complaint?.trim() && !form.diagnosis_text?.trim()) {
      Alert.alert('Consulta médica', 'Registra al menos motivo principal o diagnóstico.');
      return;
    }
    setSaving(true);
    try {
      let saved: DoctorConsultation;
      if (consultation?.id ?? params.consultationId) {
        saved = await updateConsultation(consultation?.id ?? params.consultationId!, form);
      } else if (params.visitId) {
        await startConsultation(params.visitId).catch(() => null);
        saved = await createConsultation({ ...form, visit: params.visitId });
      } else {
        saved = await createConsultation(form);
      }
      setConsultation(saved);
      Alert.alert('Consulta médica', 'Consulta guardada correctamente.');
    } catch (err) {
      Alert.alert('Consulta médica', err instanceof Error ? err.message : 'Este módulo aún no está disponible.');
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!form.chief_complaint?.trim() || !form.diagnosis_text?.trim()) {
      Alert.alert('Consulta médica', 'Motivo principal y diagnóstico son requeridos para finalizar.');
      return;
    }
    setFinishing(true);
    try {
      if (params.visitId) {
        await completeConsultation(params.visitId, form);
      } else if (consultation?.id) {
        await updateConsultation(consultation.id, { ...form, assessment: form.assessment ?? 'Finalizada' });
      }
      Alert.alert('Consulta médica', 'Consulta finalizada correctamente.');
      navigation.getParent()?.navigate('DoctorWaitingRoomTab');
    } catch (err) {
      Alert.alert('Consulta médica', err instanceof Error ? err.message : 'No se pudo finalizar la consulta.');
    } finally {
      setFinishing(false);
    }
  }

  const consultationId = consultation?.id ?? params.consultationId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Consulta médica" />
        <PatientSummaryCard patient={params.patient ?? consultation?.patient} />
        <ConsultationForm form={form} onChange={updateField} onSave={save} saving={saving} />
        <View style={styles.actions}>
          <AppButton label="Crear receta" onPress={() => navigation.navigate('DoctorPrescription', { consultationId, visitId: params.visitId })} variant="secondary" />
          <AppButton label="Crear orden médica" onPress={() => navigation.navigate('DoctorMedicalOrder', { consultationId, visitId: params.visitId })} variant="secondary" />
          <AppButton label="Registrar consumo" onPress={() => navigation.navigate('DoctorClinicalConsumption', { consultationId, visitId: params.visitId })} variant="secondary" />
          <AppButton label="Finalizar consulta" loading={finishing} onPress={finish} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
