import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/dateUtils';
import { BedStatusBadge, HospitalizationStatusBadge } from '@/features/nurse/hospitalization/components/HospitalizationBadges';
import { noteTypeLabel } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import type {
  HospitalBed,
  HospitalizationEvent,
  InpatientVitalSigns,
  NurseHospitalizationDashboard,
  NurseHospitalizationDetail,
  NurseHospitalizationListItem,
  NursingNote,
} from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

function valueOrFallback(value?: string | number | null, fallback = 'No registrado') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

export function resolvePatientName(item?: NurseHospitalizationListItem | NurseHospitalizationDetail | null) {
  const patient = typeof item?.patient === 'object' ? item.patient : null;
  const combined = [patient?.nombres ?? patient?.first_name, patient?.apellidos ?? patient?.last_name].filter(Boolean).join(' ');
  return item?.patient_name || patient?.nombre_completo || patient?.full_name || combined || 'Paciente sin nombre';
}

export function resolveBed(item?: NurseHospitalizationListItem | NurseHospitalizationDetail | null): HospitalBed | null {
  if (item?.current_bed && typeof item.current_bed === 'object') return item.current_bed;
  return null;
}

export function resolveBedCode(item?: NurseHospitalizationListItem | NurseHospitalizationDetail | null) {
  return resolveBed(item)?.bed_code || item?.current_bed_code || item?.bed_code || 'Sin cama asignada';
}

export function HospitalizationSummaryCard({ summary }: { summary: NurseHospitalizationDashboard }) {
  const items = [
    ['Internados activos', summary.active_patients ?? 0, 'account-injury-outline'],
    ['En observación', summary.observation_patients ?? 0, 'eye-outline'],
    ['Camas disponibles', summary.available_beds ?? 0, 'bed-empty'],
    ['Camas ocupadas', summary.occupied_beds ?? 0, 'bed'],
    ['En limpieza', summary.cleaning_beds ?? 0, 'broom'],
    ['Notas urgentes', summary.urgent_notes ?? 0, 'alert-outline'],
  ] as const;
  return (
    <View style={styles.statsGrid}>
      {items.map(([label, value, icon]) => (
        <AppCard key={label} style={styles.statCard}>
          <MaterialCommunityIcons color={colors.primary} name={icon} size={22} />
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </AppCard>
      ))}
    </View>
  );
}

export function InpatientCard({
  item,
  onAddNote,
  onPress,
  onVitals,
}: {
  item: NurseHospitalizationListItem;
  onAddNote?: () => void;
  onPress?: () => void;
  onVitals?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons color={colors.primary} name="account-heart-outline" size={24} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.title}>{resolvePatientName(item)}</Text>
            <Text style={styles.meta}>{[item.patient_age, item.patient_gender, item.patient_code].filter(Boolean).join(' · ') || 'Datos básicos pendientes'}</Text>
          </View>
          <HospitalizationStatusBadge status={item.status} />
        </View>
        <Text style={styles.description}>{item.reason || 'Sin motivo registrado.'}</Text>
        <View style={styles.infoGrid}>
          <InfoPill icon="door-open" label="Habitación" value={item.current_room || resolveBed(item)?.room_name || 'Sin habitación'} />
          <InfoPill icon="bed" label="Cama" value={resolveBedCode(item)} />
          <InfoPill icon="doctor" label="Médico" value={item.responsible_doctor_name || 'No asignado'} />
          <InfoPill icon="calendar-clock" label="Ingreso" value={formatDateTime(item.admission_datetime, 'Sin fecha')} />
        </View>
        <View style={styles.actions}>
          <SmallAction icon="heart-pulse" label="Signos" onPress={onVitals} />
          <SmallAction icon="note-plus-outline" label="Nota" onPress={onAddNote} />
        </View>
      </AppCard>
    </Pressable>
  );
}

export function InpatientPatientCard({ detail }: { detail: NurseHospitalizationDetail }) {
  const patient = typeof detail.patient === 'object' ? detail.patient : null;
  return (
    <AppCard style={styles.card}>
      <Text style={styles.sectionTitle}>Paciente</Text>
      <Text style={styles.title}>{resolvePatientName(detail)}</Text>
      <View style={styles.infoGrid}>
        <InfoPill icon="identifier" label="Identidad" value={patient?.identidad || patient?.identity_number || 'No registrada'} />
        <InfoPill icon="phone" label="Teléfono" value={patient?.telefono || patient?.phone || 'No registrado'} />
        <InfoPill icon="gender-male-female" label="Sexo" value={patient?.genero || patient?.gender || detail.patient_gender || 'No registrado'} />
        <InfoPill icon="water" label="Tipo de sangre" value={patient?.tipo_sangre || patient?.blood_type || 'No registrado'} />
      </View>
      <Text style={styles.description}>Alergias: {patient?.alergias || patient?.allergies || 'No registradas'}</Text>
      <Text style={styles.description}>Enfermedades crónicas: {patient?.enfermedades_cronicas || patient?.chronic_diseases || 'No registradas'}</Text>
    </AppCard>
  );
}

export function CurrentBedCard({ detail }: { detail: NurseHospitalizationDetail }) {
  const bed = resolveBed(detail);
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Habitación y cama</Text>
        <BedStatusBadge status={bed?.status} />
      </View>
      {bed ? (
        <View style={styles.infoGrid}>
          <InfoPill icon="door" label="Habitación" value={bed.room_name || bed.room_number || detail.current_room || 'No registrada'} />
          <InfoPill icon="bed" label="Cama" value={bed.bed_code || bed.bed_number || 'No registrada'} />
          <InfoPill icon="stairs" label="Piso" value={typeof bed.room === 'object' ? bed.room?.floor || 'No registrado' : 'No registrado'} />
          <InfoPill icon="clipboard-text-outline" label="Notas" value={bed.notes || 'Sin notas'} />
        </View>
      ) : (
        <Text style={styles.description}>Este paciente aún no tiene cama asignada.</Text>
      )}
    </AppCard>
  );
}

export function InpatientVitalSignsCard({ item }: { item: InpatientVitalSigns }) {
  const pressure = item.blood_pressure || (item.blood_pressure_systolic || item.systolic_pressure ? `${item.blood_pressure_systolic ?? item.systolic_pressure}/${item.blood_pressure_diastolic ?? item.diastolic_pressure}` : undefined);
  const rows = [
    ['Temperatura', item.temperature ? `${item.temperature} °C` : undefined],
    ['Presión arterial', pressure],
    ['Frecuencia cardíaca', item.heart_rate ? `${item.heart_rate} lpm` : undefined],
    ['Frecuencia respiratoria', item.respiratory_rate ? `${item.respiratory_rate} rpm` : undefined],
    ['Saturación de oxígeno', item.oxygen_saturation ? `${item.oxygen_saturation}%` : undefined],
    ['Dolor', item.pain_scale !== undefined && item.pain_scale !== '' ? `${item.pain_scale}/10` : undefined],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  return (
    <AppCard style={styles.card}>
      <Text style={styles.small}>{formatDateTime(item.recorded_at ?? item.creado_en ?? item.created_at)} · {item.recorded_by_name || 'Enfermería'}</Text>
      <View style={styles.infoGrid}>
        {rows.map(([label, value]) => <InfoPill key={label} icon="chart-line" label={label} value={valueOrFallback(value)} />)}
      </View>
      {item.notes ? <Text style={styles.description}>{item.notes}</Text> : null}
    </AppCard>
  );
}

export function NursingNoteCard({ item }: { item: NursingNote }) {
  const type = item.note_type || item.priority;
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{noteTypeLabel(type)}</Text>
        <Text style={styles.small}>{formatDateTime(item.recorded_at ?? item.creado_en ?? item.created_at)}</Text>
      </View>
      <Text style={styles.description}>{item.note || item.content}</Text>
      <Text style={styles.small}>{item.created_by_name || item.nurse_name || 'Enfermería'}</Text>
    </AppCard>
  );
}

export function HospitalizationEventCard({ item }: { item: HospitalizationEvent }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDot} />
      <AppCard style={[styles.card, styles.timelineCard]}>
        <Text style={styles.title}>{eventLabel(item.event_type)}</Text>
        <Text style={styles.description}>{item.description || 'Evento de hospitalización registrado.'}</Text>
        <Text style={styles.small}>{[item.created_by_name, formatDateTime(item.creado_en ?? item.created_at)].filter(Boolean).join(' · ')}</Text>
      </AppCard>
    </View>
  );
}

export function BedCard({ bed }: { bed: HospitalBed }) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.grow}>
          <Text style={styles.title}>{bed.bed_code || bed.bed_number || 'Cama sin código'}</Text>
          <Text style={styles.meta}>{bed.room_name || bed.room_number || 'Habitación no registrada'}</Text>
        </View>
        <BedStatusBadge status={bed.status} />
      </View>
      {bed.current_patient ? <Text style={styles.description}>Paciente: {bed.current_patient}</Text> : null}
      {bed.notes ? <Text style={styles.description}>{bed.notes}</Text> : null}
    </AppCard>
  );
}

function InfoPill({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <MaterialCommunityIcons color={colors.primary} name={icon} size={17} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SmallAction({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
      <MaterialCommunityIcons color={colors.primary} name={icon} size={18} />
      <Text style={styles.smallActionText}>{label}</Text>
    </Pressable>
  );
}

function eventLabel(type?: string) {
  const labels: Record<string, string> = {
    admission_created: 'Ingreso creado',
    bed_assigned: 'Cama asignada',
    bed_changed: 'Cambio de cama',
    cancelled: 'Cancelación',
    discharged: 'Alta hospitalaria',
    nursing_note_created: 'Nota de enfermería',
    vital_signs_recorded: 'Signos vitales',
  };
  return labels[String(type ?? '').toLowerCase()] ?? 'Evento';
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  card: {
    gap: 12,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  grow: {
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  infoPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    flexGrow: 1,
    gap: 4,
    minWidth: '46%',
    padding: 10,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  small: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  smallAction: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  smallActionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  statCard: {
    flexGrow: 1,
    gap: 5,
    minWidth: '46%',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  statValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timelineCard: {
    flex: 1,
  },
  timelineDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 12,
    marginTop: 22,
    width: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
