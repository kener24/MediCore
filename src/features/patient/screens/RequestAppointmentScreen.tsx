import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppDateInput } from '@/components/AppDateInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { isPastISODate, toISODate } from '@/core/utils/dateUtils';
import { AppointmentModalitySelector } from '@/features/patient/components/AppointmentModalitySelector';
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
  AppointmentModality,
  PatientDoctor,
  PatientSpecialty,
} from '@/features/patient/types/patientAppointments.types';

const onlineDisabledMessage = 'Esta clinica no tiene habilitadas las citas en linea. Puedes solicitar una cita presencial.';

export function RequestAppointmentScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [specialties, setSpecialties] = useState<PatientSpecialty[]>([]);
  const [doctors, setDoctors] = useState<PatientDoctor[]>([]);
  const [slots, setSlots] = useState<AppointmentAvailabilitySlot[]>([]);
  const [specialty, setSpecialty] = useState<PatientSpecialty | null>(null);
  const [doctor, setDoctor] = useState<PatientDoctor | null>(null);
  const [date, setDate] = useState('');
  const [modality, setModality] = useState<AppointmentModality>('presencial');
  const [slot, setSlot] = useState<AppointmentAvailabilitySlot | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
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

  function resetAvailability() {
    setSlot(null);
    setSlots([]);
    setAvailabilityChecked(false);
    setAvailabilityMessage('');
  }

  function updateDate(nextDate: string) {
    setDate(nextDate);
    resetAvailability();
  }

  async function selectSpecialty(nextSpecialty: PatientSpecialty) {
    setSpecialty(nextSpecialty);
    setDoctor(null);
    resetAvailability();
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
    setAvailabilityChecked(false);
    setAvailabilityMessage('');
    try {
      const availability = await getPatientDoctorAvailability(doctor.id, date.trim(), modality);
      const nextSlots = (availability.available_slots ?? []).filter((item) => item.available !== false);
      setSlots(nextSlots);
      setSlot(null);

      if (modality === 'online' && availability.allow_online_appointments === false) {
        const message = availability.message || onlineDisabledMessage;
        setAvailabilityMessage(message);
        Alert.alert('Citas en linea', message);
      } else if (nextSlots.length) {
        setAvailabilityMessage(`${nextSlots.length} horario${nextSlots.length === 1 ? '' : 's'} disponible${nextSlots.length === 1 ? '' : 's'} para la fecha seleccionada.`);
      } else {
        const nextAvailability = await findNextAvailability(doctor.id, date.trim(), modality);
        if (nextAvailability) {
          setDate(nextAvailability.date);
          setSlots(nextAvailability.slots);
          setAvailabilityMessage(`No habia cupos para ${date.trim()}, pero encontre disponibilidad para ${nextAvailability.date}. Selecciona un horario para continuar.`);
        } else {
          setAvailabilityMessage(availability.message || 'No hay horarios disponibles en los proximos dias. Prueba otro medico o contacta a la clinica.');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No hay horarios disponibles.';
      setAvailabilityMessage(message);
      Alert.alert('Disponibilidad', message);
    } finally {
      setAvailabilityChecked(true);
      setLoadingAvailability(false);
    }
  }

  async function submit() {
    if (!specialty) return Alert.alert('Solicitud', 'Selecciona una especialidad.');
    if (!doctor) return Alert.alert('Solicitud', 'Selecciona un medico.');
    if (!modality) return Alert.alert('Solicitud', 'Selecciona una modalidad valida.');
    const dateValidation = validateDate(date);
    if (dateValidation) return Alert.alert('Solicitud', dateValidation);
    if (!slot) return Alert.alert('Solicitud', 'Selecciona un horario.');
    if (reason.trim().length < 5) return Alert.alert('Solicitud', 'Escribe el motivo de tu consulta.');

    setSubmitting(true);
    try {
      await requestPatientAppointment({
        doctor: doctor.id,
        modality,
        reason: reason.trim(),
        scheduled_date: date.trim(),
        start_time: slot.start_time,
      });
      Alert.alert('Solicitud enviada', 'Solicitud de cita enviada correctamente.', [
        { text: 'Ver mis citas', onPress: goToAppointments },
      ]);
    } catch (err) {
      Alert.alert('Solicitud', err instanceof Error ? err.message : 'El horario ya fue tomado.');
    } finally {
      setSubmitting(false);
    }
  }

  function goToAppointments() {
    const parent = navigation.getParent<NavigationProp<ParamListBase>>();
    if (parent) {
      parent.navigate('PatientAppointmentsTab', { screen: 'PatientAppointments' });
      return;
    }
    navigation.navigate('PatientAppointments');
  }

  if (loading) return <LoadingState label="Cargando especialidades..." />;

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.content}>
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
                label={item.nombre_completo || item.full_name || item.user_nombre || item.nombre || item.name || `Medico ${item.id}`}
                onPress={() => {
                  setDoctor(item);
                  resetAvailability();
                }}
                variant={doctor?.id === item.id ? 'primary' : 'secondary'}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.help}>Selecciona una especialidad para ver medicos.</Text>
        )}
      </Step>

      <Step title="3. Fecha">
        <AppDateInput
          label="Fecha"
          minimumDate={new Date()}
          onChange={updateDate}
          placeholder="YYYY-MM-DD"
          value={date}
        />
        <View style={styles.dateActions}>
          <AppButton label="Manana" onPress={() => updateDate(toISODate(addDays(1)))} style={styles.dateAction} variant="secondary" />
          <AppButton label="En 7 dias" onPress={() => updateDate(toISODate(addDays(7)))} style={styles.dateAction} variant="secondary" />
        </View>
      </Step>

      <Step title="4. Modalidad">
        <AppointmentModalitySelector
          onChange={(value) => {
            setModality(value);
            resetAvailability();
          }}
          value={modality}
        />
      </Step>

      <Step title="5. Disponibilidad">
        <AppButton label="Consultar disponibilidad" loading={loadingAvailability} onPress={loadAvailability} variant="secondary" />
        {availabilityMessage ? <Text style={[styles.help, slots.length ? styles.success : styles.warning]}>{availabilityMessage}</Text> : null}
        {slots.length ? (
          <AvailabilitySlotSelector onSelectSlot={setSlot} selectedSlot={slot} slots={slots} />
        ) : availabilityChecked ? (
          <Text style={styles.help}>No se encontraron horarios disponibles con los datos seleccionados.</Text>
        ) : (
          <Text style={styles.help}>Selecciona medico, fecha y modalidad; luego consulta disponibilidad.</Text>
        )}
      </Step>

      <Step title="6. Motivo">
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
    </KeyboardAwareScreen>
  );
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function addDaysToISODate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

async function findNextAvailability(doctorId: number, fromDate: string, modality: AppointmentModality) {
  for (let offset = 1; offset <= 21; offset += 1) {
    const candidateDate = addDaysToISODate(fromDate, offset);
    const availability = await getPatientDoctorAvailability(doctorId, candidateDate, modality);
    if (modality === 'online' && availability.allow_online_appointments === false) return null;
    const candidateSlots = (availability.available_slots ?? []).filter((item) => item.available !== false);
    if (candidateSlots.length) return { date: candidateDate, slots: candidateSlots };
  }
  return null;
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
    paddingBottom: 118,
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
  step: {
    gap: 12,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  success: {
    color: colors.success,
    fontWeight: '800',
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
  warning: {
    color: colors.warning,
    fontWeight: '800',
  },
});
