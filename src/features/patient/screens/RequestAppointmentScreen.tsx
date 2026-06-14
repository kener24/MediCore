import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import {
  getPatientDoctorAvailability,
  getPatientDoctors,
  getPatientSpecialties,
  requestPatientAppointment,
} from '@/features/patient/services/patientAppointmentsService';
import type {
  AppointmentAvailabilitySlot,
  PatientDoctor,
  PatientSpecialty,
} from '@/features/patient/types/patientAppointments.types';
import { formatTime } from '@/features/patient/utils/formatters';

export function RequestAppointmentScreen() {
  const navigation = useNavigation();
  const [specialties, setSpecialties] = useState<PatientSpecialty[]>([]);
  const [doctors, setDoctors] = useState<PatientDoctor[]>([]);
  const [slots, setSlots] = useState<AppointmentAvailabilitySlot[]>([]);
  const [specialty, setSpecialty] = useState<PatientSpecialty | null>(null);
  const [doctor, setDoctor] = useState<PatientDoctor | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<AppointmentAvailabilitySlot | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSpecialties() {
      setLoading(true);
      setError('');
      try {
        setSpecialties(await getPatientSpecialties());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        setLoading(false);
      }
    }
    loadSpecialties();
  }, []);

  async function selectSpecialty(nextSpecialty: PatientSpecialty) {
    setSpecialty(nextSpecialty);
    setDoctor(null);
    setSlot(null);
    setSlots([]);
    try {
      setDoctors(await getPatientDoctors(nextSpecialty.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar medicos.');
    }
  }

  async function loadAvailability() {
    if (!doctor || !date.trim()) {
      Alert.alert('Disponibilidad', 'Selecciona medico y fecha.');
      return;
    }
    try {
      const availability = await getPatientDoctorAvailability(doctor.id, date.trim());
      setSlots(availability.available_slots ?? []);
      setSlot(null);
      if (availability.allow_online_appointments === false) {
        Alert.alert('Citas en linea', 'La clinica no permite citas en linea.');
      }
    } catch (err) {
      Alert.alert('Disponibilidad', err instanceof Error ? err.message : 'No hay horarios disponibles.');
    }
  }

  async function submit() {
    if (!specialty) return Alert.alert('Solicitud', 'Selecciona una especialidad.');
    if (!doctor) return Alert.alert('Solicitud', 'Selecciona un medico.');
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      return Alert.alert('Solicitud', 'Ingresa una fecha valida en formato YYYY-MM-DD.');
    }
    if (!slot) return Alert.alert('Solicitud', 'Selecciona un horario.');
    if (!reason.trim()) return Alert.alert('Solicitud', 'Ingresa el motivo de la cita.');

    setSubmitting(true);
    try {
      await requestPatientAppointment({
        doctor: doctor.id,
        reason: reason.trim(),
        scheduled_date: date.trim(),
        start_time: slot.start_time,
      });
      Alert.alert('Solicitud enviada', 'Tu solicitud de cita fue enviada correctamente.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Solicitud', err instanceof Error ? err.message : 'El horario ya fue tomado.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando especialidades..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Completa los datos requeridos para enviar tu solicitud." title="Solicitar cita" />
        {error ? <ErrorState message={error} title="No se pudo cargar informacion" /> : null}

        <Step title="1. Especialidad">
          {specialties.length ? (
            <View style={styles.options}>
              {specialties.map((item) => (
                <AppButton
                  key={item.id}
                  label={item.nombre || item.name || `Especialidad ${item.id}`}
                  onPress={() => selectSpecialty(item)}
                  variant={specialty?.id === item.id ? 'primary' : 'secondary'}
                />
              ))}
            </View>
          ) : (
            <EmptyState description="La clinica no tiene especialidades disponibles." title="Sin especialidades" />
          )}
        </Step>

        <Step title="2. Medico">
          {doctors.length ? (
            <View style={styles.options}>
              {doctors.map((item) => (
                <AppButton
                  key={item.id}
                  label={item.nombre_completo || item.full_name || item.nombre || item.name || `Medico ${item.id}`}
                  onPress={() => {
                    setDoctor(item);
                    setSlot(null);
                    setSlots([]);
                  }}
                  variant={doctor?.id === item.id ? 'primary' : 'secondary'}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.help}>Selecciona una especialidad para ver medicos.</Text>
          )}
        </Step>

        <Step title="3. Fecha y disponibilidad">
          <AppInput
            icon="calendar"
            keyboardType="numbers-and-punctuation"
            label="Fecha"
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            value={date}
          />
          <AppButton label="Consultar disponibilidad" onPress={loadAvailability} variant="secondary" />
          {slots.length ? (
            <View style={styles.options}>
              {slots.map((item) => (
                <AppButton
                  key={`${item.start_time}-${item.end_time}`}
                  label={`${formatTime(item.start_time)}${item.end_time ? ` - ${formatTime(item.end_time)}` : ''}`}
                  onPress={() => setSlot(item)}
                  variant={slot?.start_time === item.start_time ? 'primary' : 'secondary'}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.help}>No hay horarios disponibles hasta consultar.</Text>
          )}
        </Step>

        <Step title="4. Motivo">
          <TextInput
            multiline
            onChangeText={setReason}
            placeholder="Describe brevemente el motivo de tu cita"
            placeholderTextColor="#98a2b3"
            style={styles.textArea}
            value={reason}
          />
        </Step>

        <AppButton label="Enviar solicitud" loading={submitting} onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ children, title }: { children: ReactNode; title: string }) {
  return (
    <AppCard style={styles.step}>
      <Text style={styles.stepTitle}>{title}</Text>
      {children}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 22,
    paddingBottom: 34,
  },
  help: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  options: {
    gap: 8,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  step: {
    gap: 12,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  textArea: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 110,
    padding: 14,
    textAlignVertical: 'top',
  },
});
