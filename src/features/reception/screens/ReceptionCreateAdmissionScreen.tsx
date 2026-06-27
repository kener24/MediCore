import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { createAdmission, getReceptionDoctors, type ReceptionDoctorOption } from '@/features/reception/services/receptionAdmissionService';
import type { CreateAdmissionPayload } from '@/features/reception/types/receptionAdmission.types';

const visitTypes = [
  ['walk_in', 'Sin cita'],
  ['appointment', 'Cita programada'],
  ['emergency', 'Emergencia'],
  ['follow_up', 'Seguimiento'],
  ['control', 'Control'],
  ['procedure', 'Procedimiento'],
] as const;

const priorities = [
  ['normal', 'Normal'],
  ['priority', 'Prioritario'],
  ['urgent', 'Urgente'],
  ['emergency', 'Emergencia'],
] as const;

export function ReceptionCreateAdmissionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialPatientId = route.params?.patientId ? String(route.params.patientId) : '';
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<ReceptionDoctorOption[]>([]);
  const [form, setForm] = useState({ patient_id: initialPatientId, visit_type: 'walk_in', reason: '', priority: 'normal', doctor_id: '' });

  useFocusEffect(useCallback(() => {
    getReceptionDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, []));

  async function submit() {
    if (!form.patient_id) return Alert.alert('Admision', 'Selecciona o ingresa un paciente.');
    if (Number(form.patient_id) <= 0) return Alert.alert('Admision', 'El paciente seleccionado no es valido.');
    if (form.reason.trim().length < 4) return Alert.alert('Admision', 'El motivo de visita es obligatorio.');
    setSaving(true);
    try {
      const payload: CreateAdmissionPayload = {
        patient_id: Number(form.patient_id),
        visit_type: form.visit_type,
        reason: form.reason.trim(),
        priority: form.priority || 'normal',
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
      };
      const visit = await createAdmission(payload);
      Alert.alert('Admision', 'Admision registrada correctamente.', [{ text: 'Ver visita', onPress: () => navigation.navigate('ReceptionVisitDetail', { visitId: visit.id }) }]);
    } catch (err) {
      Alert.alert('Admision', err instanceof Error ? err.message : 'No se pudo crear la admision.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppHeader icon="clipboard-plus-outline" subtitle="Registra la llegada del paciente a la clinica." title="Nueva admision" />
          <AppCard style={styles.form}>
            <AppInput keyboardType="number-pad" label="ID de paciente" onChangeText={(value) => setForm({ ...form, patient_id: value.replace(/[^0-9]/g, '') })} value={form.patient_id} />
            {!initialPatientId ? <AppButton label="Buscar paciente" onPress={() => navigation.navigate('ReceptionPatientSearch')} variant="secondary" /> : null}
            <Text style={styles.label}>Tipo de visita</Text>
            <View style={styles.chips}>{visitTypes.map(([value, label]) => <Chip active={form.visit_type === value} key={value} label={label} onPress={() => setForm({ ...form, visit_type: value })} />)}</View>
            <AppInput label="Motivo" multiline onChangeText={(value) => setForm({ ...form, reason: value })} style={styles.notes} value={form.reason} />
            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.chips}>{priorities.map(([value, label]) => <Chip active={form.priority === value} key={value} label={label} onPress={() => setForm({ ...form, priority: value })} />)}</View>
            <Text style={styles.label}>Medico destino</Text>
            <View style={styles.chips}>
              <Chip active={!form.doctor_id} label="Sin asignar" onPress={() => setForm({ ...form, doctor_id: '' })} />
              {doctors.map((doctor) => (
                <Chip
                  active={form.doctor_id === String(doctor.id)}
                  key={doctor.id}
                  label={doctor.user_nombre ?? doctor.nombre_completo ?? doctor.full_name ?? `Medico ${doctor.id}`}
                  onPress={() => setForm({ ...form, doctor_id: String(doctor.id) })}
                />
              ))}
            </View>
            <AppButton label="Registrar admision" loading={saving} onPress={submit} />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Text onPress={onPress} style={[styles.chip, active && styles.chipActive, active && styles.chipTextActive]}>{label}</Text>;
}

const styles = StyleSheet.create({
  chip: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 999, borderWidth: 1, color: colors.muted, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTextActive: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  notes: { minHeight: 96, textAlignVertical: 'top' },
  safe: { backgroundColor: colors.background, flex: 1 },
});
