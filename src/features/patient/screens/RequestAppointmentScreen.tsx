import { useNavigation, useRoute, type NavigationProp, type ParamListBase } from '@react-navigation/native';
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
  reschedulePatientAppointment,
} from '@/features/patient/services/patientAppointmentsService';
import type {
  AppointmentAvailabilitySlot,
  AppointmentModality,
  PatientDoctor,
  PatientSpecialty,
} from '@/features/patient/types/patientAppointments.types';

const onlineDisabledMessage = 'Esta clínica no tiene habilitadas las citas en línea. Puedes solicitar una cita presencial.';

export function RequestAppointmentScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as {
    previousAppointmentDate?: string;
    previousAppointmentDoctor?: string;
    previousDoctorId?: number | string;
    previousSpecialtyId?: number | string;
    rescheduleFrom?: number | string;
  };
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
  const [operationKey, setOperationKey] = useState(() => `patient-appointment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const canSubmit = Boolean(specialty && doctor && date.trim() && slot && reason.trim().length >= 5 && !submitting);
  const isRescheduleFlow = Boolean(routeParams.rescheduleFrom);

  useEffect(() => {
    async function loadSpecialties() {
      setLoading(true);
      setError('');
      try {
        const loadedSpecialties = await getPatientSpecialties();
        setSpecialties(loadedSpecialties);
        if (routeParams.rescheduleFrom && routeParams.previousSpecialtyId && routeParams.previousDoctorId) {
          const selectedSpecialty = loadedSpecialties.find((item) => String(item.id) === String(routeParams.previousSpecialtyId));
          if (selectedSpecialty) {
            setSpecialty(selectedSpecialty);
            const loadedDoctors = await getPatientDoctors(selectedSpecialty.id);
            setDoctors(loadedDoctors);
            const selectedDoctor = loadedDoctors.find((item) => String(item.id) === String(routeParams.previousDoctorId));
            if (selectedDoctor) setDoctor(selectedDoctor);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        setLoading(false);
      }
    }
    loadSpecialties();
  }, [routeParams.previousDoctorId, routeParams.previousSpecialtyId, routeParams.rescheduleFrom]);

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
      setError(err instanceof Error ? err.message : 'Error al cargar médicos.');
    }
  }

  async function loadAvailability() {
    const validation = validateDate(date);
    if (!doctor) {
      Alert.alert('Disponibilidad', 'Selecciona un médico.');
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
          setAvailabilityMessage(availability.message || 'No hay horarios disponibles en los próximos días. Prueba otro médico o contacta a la clínica.');
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
    if (!doctor) return Alert.alert('Solicitud', 'Selecciona un médico.');
    if (!modality) return Alert.alert('Solicitud', 'Selecciona una modalidad válida.');
    const dateValidation = validateDate(date);
    if (dateValidation) return Alert.alert('Solicitud', dateValidation);
    if (!slot) return Alert.alert('Solicitud', 'Selecciona un horario.');
    if (reason.trim().length < 5) return Alert.alert('Solicitud', 'Escribe el motivo de tu consulta.');

    setSubmitting(true);
    try {
      if (isRescheduleFlow && routeParams.rescheduleFrom) {
        await reschedulePatientAppointment(
          routeParams.rescheduleFrom,
          { reason: reason.trim(), scheduled_date: date.trim(), start_time: slot.start_time },
          operationKey,
        );
      } else {
        await requestPatientAppointment(
          {
            doctor: doctor.id,
            modality,
            reason: reason.trim(),
            scheduled_date: date.trim(),
            start_time: slot.start_time,
          },
          operationKey,
        );
      }
      Alert.alert(isRescheduleFlow ? 'Cita reprogramada' : 'Solicitud enviada', isRescheduleFlow ? 'La misma cita fue reprogramada correctamente.' : 'Solicitud de cita enviada correctamente.', [
        { text: 'Ver mis citas', onPress: goToAppointments },
      ]);
    } catch (err) {
      setOperationKey(`patient-appointment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
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
      <PatientHeader
        subtitle={isRescheduleFlow ? 'Selecciona una nueva fecha y horario. Se actualizará la misma cita y se conservará su historial.' : 'Completa los datos requeridos para enviar tu solicitud.'}
        title={isRescheduleFlow ? 'Reprogramar cita' : 'Solicitar cita'}
      />
      {error ? <ErrorState message={error} title="No se pudo cargar información" /> : null}
      {isRescheduleFlow ? (
        <AppCard style={styles.notice}>
          <Text style={styles.noticeTitle}>Reprogramación segura</Text>
          <Text style={styles.help}>
            Cita original: {routeParams.previousAppointmentDate || 'fecha no indicada'}
            {routeParams.previousAppointmentDoctor ? ` con ${routeParams.previousAppointmentDoctor}` : ''}. Al confirmar, la fecha y hora se actualizarán sin crear una cita duplicada.
          </Text>
        </AppCard>
      ) : null}

      <Step title="1. Especialidad">
        {specialties.length ? (
          <View style={styles.options}>
            {specialties.map((item) => (
              <AppButton
                key={item.id}
                label={item.nombre || item.name || `Especialidad ${item.id}`}
                onPress={() => selectSpecialty(item)}
                disabled={isRescheduleFlow}
                variant={specialty?.id === item.id ? 'primary' : 'secondary'}
              />
            ))}
          </View>
        ) : (
          <EmptyState description="La clínica no tiene especialidades disponibles." title="Sin especialidades" />
        )}
      </Step>

      <Step title="2. Médico">
        {doctors.length ? (
          <View style={styles.options}>
            {doctors.map((item) => (
              <AppButton
                key={item.id}
                label={item.nombre_completo || item.full_name || item.user_nombre || item.nombre || item.name || `Médico ${item.id}`}
                onPress={() => {
                  setDoctor(item);
                  resetAvailability();
                }}
                disabled={isRescheduleFlow}
                variant={doctor?.id === item.id ? 'primary' : 'secondary'}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.help}>Selecciona una especialidad para ver médicos.</Text>
        )}
      </Step>

      <Step title="3. Fecha">
        <AppDateInput
          label="Fecha"
          minimumDate={new Date()}
          onChange={updateDate}
          placeholder="Seleccionar fecha"
          value={date}
        />
        <View style={styles.dateActions}>
          <AppButton label="Mañana" onPress={() => updateDate(toISODate(addDays(1)))} style={styles.dateAction} variant="secondary" />
          <AppButton label="En 7 días" onPress={() => updateDate(toISODate(addDays(7)))} style={styles.dateAction} variant="secondary" />
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
          <Text style={styles.help}>Selecciona médico, fecha y modalidad; luego consulta disponibilidad.</Text>
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
        <Text style={[styles.help, reason.trim().length >= 5 ? styles.success : styles.warning]}>
          {reason.trim().length}/5 caracteres mínimos
        </Text>
      </Step>

      <AppButton disabled={!canSubmit} label={isRescheduleFlow ? 'Confirmar reprogramación' : 'Enviar solicitud'} loading={submitting} onPress={submit} />
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
    try {
      const availability = await getPatientDoctorAvailability(doctorId, candidateDate, modality);
      if (modality === 'online' && availability.allow_online_appointments === false) return null;
      const candidateSlots = (availability.available_slots ?? []).filter((item) => item.available !== false);
      if (candidateSlots.length) return { date: candidateDate, slots: candidateSlots };
    } catch {
      // Keep scanning the next dates; one failing day should not block scheduling.
    }
  }
  return null;
}

function validateDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'Selecciona una fecha.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'Selecciona una fecha válida.';
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Selecciona una fecha válida.';
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
  notice: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    gap: 6,
  },
  noticeTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
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
