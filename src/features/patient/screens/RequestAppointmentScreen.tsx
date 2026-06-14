import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
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
import { isPastISODate, toISODate } from '@/core/utils/dateUtils';
import { AvailabilitySlotSelector } from '@/features/patient/components/AvailabilitySlotSelector';
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

export function RequestAppointmentScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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
  const [loadingAvailability, setLoadingAvailability] = useState(false);
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
    setError('');
    try {
      setDoctors(await getPatientDoctors(nextSpecialty.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar medicos.');
    }
  }

  async function loadAvailability() {
    const validation = validateDate(date);
    if (!doctor) {
      Alert.alert('Disponibilidad', 'Selecciona un medico.');
      return;
    }
    if (validation) {
      Alert.alert('Disponibilidad', validation);
      return;
    }
    setLoadingAvailability(true);
    try {
      const availability = await getPatientDoctorAvailability(doctor.id, date.trim());
      setSlots((availability.available_slots ?? []).filter((item) => item.available !== false));
      setSlot(null);
      if (availability.allow_online_appointments === false) {
        Alert.alert('Citas en linea', 'La clinica no permite citas en linea.');
      }
    } catch (err) {
      Alert.alert('Disponibilidad', err instanceof Error ? err.message : 'No hay horarios disponibles.');
    } finally {
      setLoadingAvailability(false);
    }
  }

  async function submit() {
    if (!specialty) return Alert.alert('Solicitud', 'Selecciona una especialidad.');
    if (!doctor) return Alert.alert('Solicitud', 'Selecciona un medico.');
    const dateValidation = validateDate(date);
    if (dateValidation) return Alert.alert('Solicitud', dateValidation);
    if (!slot) return Alert.alert('Solicitud', 'Selecciona un horario.');
    if (reason.trim().length < 5) return Alert.alert('Solicitud', 'Escribe el motivo de tu consulta.');

    setSubmitting(true);
    try {
      const created = await requestPatientAppointment({
        doctor: doctor.id,
        reason: reason.trim(),
        scheduled_date: date.trim(),
        start_time: slot.start_time,
      });
      Alert.alert('Solicitud enviada', 'Tu solicitud de cita fue enviada correctamente.');
      if (created?.id) {
        navigation.navigate('PatientAppointmentDetail', { id: created.id });
      } else {
        navigation.getParent()?.navigate('PatientAppointmentsTab');
      }
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
          <View style={styles.dateActions}>
            <AppButton
              label="Manana"
              onPress={() => setDate(toISODate(addDays(1)))}
              style={styles.dateAction}
              variant="secondary"
            />
            <AppButton
              label="En 7 dias"
              onPress={() => setDate(toISODate(addDays(7)))}
              style={styles.dateAction}
              variant="secondary"
            />
          </View>
          <AppButton
            label="Consultar disponibilidad"
            loading={loadingAvailability}
            onPress={loadAvailability}
            variant="secondary"
          />
          {slots.length ? (
            <AvailabilitySlotSelector onSelectSlot={setSlot} selectedSlot={slot} slots={slots} />
          ) : (
            <Text style={styles.help}>No hay horarios disponibles para esta fecha.</Text>
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

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function validateDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'Selecciona una fecha.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'Ingresa una fecha valida en formato YYYY-MM-DD.';
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Ingresa una fecha valida.';
  if (isPastISODate(trimmed)) return 'La fecha no puede ser pasada.';
  return '';
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
  dateAction: {
    flex: 1,
    height: 44,
  },
  dateActions: {
    flexDirection: 'row',
    gap: 8,
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
