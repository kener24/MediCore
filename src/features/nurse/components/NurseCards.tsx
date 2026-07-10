import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/core/theme/colors';
import type { NursePatientSummary, NurseTriage, NurseVitalSigns } from '@/features/nurse/types/nurse.types';
import { getVitalSignAlerts } from '@/features/nurse/utils/nurseValidation';

export function priorityLabel(priority?: string) {
  const labels: Record<string, string> = {
    critical: 'Crítica',
    critica: 'Crítica',
    urgent: 'Urgente',
    urgente: 'Urgente',
    preferential: 'Preferente',
    preferente: 'Preferente',
    normal: 'Normal',
    low: 'Baja',
    baja: 'Baja',
  };
  return labels[String(priority ?? '').toLowerCase()] ?? 'Sin prioridad';
}

export function PatientQueueCard({ onPress, patient }: { onPress?: () => void; patient: NursePatientSummary }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons color={colors.primary} name="account-heart-outline" size={24} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.title}>{patient.name}</Text>
            <Text style={styles.meta}>{[patient.age, patient.gender, patient.document].filter(Boolean).join(' · ') || 'Datos básicos pendientes'}</Text>
          </View>
          <StatusBadge label={priorityLabel(patient.priority)} status={patient.priority ?? 'pending'} />
        </View>
        <Text style={styles.description}>{patient.reason || 'Sin motivo registrado.'}</Text>
        <View style={styles.footer}>
          <Text style={styles.small}>{patient.arrivalTime ? `Ingreso: ${patient.arrivalTime}` : 'Ingreso pendiente'}</Text>
          <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={22} />
        </View>
      </AppCard>
    </Pressable>
  );
}

export function ClinicalAlerts({ vitalSigns }: { vitalSigns?: NurseVitalSigns | null }) {
  const alerts = getVitalSignAlerts(vitalSigns);
  if (!alerts.length) return null;
  return (
    <View style={styles.alertBox}>
      <View style={styles.alertHeader}>
        <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={20} />
        <Text style={styles.alertTitle}>Alertas clínicas</Text>
      </View>
      {alerts.map((alert) => (
        <Text key={alert} style={styles.alertText}>- {alert}</Text>
      ))}
    </View>
  );
}

export function VitalSignsSummary({ vitalSigns }: { vitalSigns?: NurseVitalSigns | null }) {
  if (!vitalSigns) {
    return (
      <AppCard>
        <Text style={styles.title}>Signos vitales</Text>
        <Text style={styles.description}>Aún no hay signos vitales registrados.</Text>
      </AppCard>
    );
  }
  const rows = [
    ['Temperatura', vitalSigns.temperature ? `${vitalSigns.temperature} °C` : undefined],
    ['Pulso', vitalSigns.heartRate ? `${vitalSigns.heartRate} lpm` : undefined],
    ['Respiración', vitalSigns.respiratoryRate ? `${vitalSigns.respiratoryRate} rpm` : undefined],
    ['Presión', vitalSigns.systolicPressure && vitalSigns.diastolicPressure ? `${vitalSigns.systolicPressure}/${vitalSigns.diastolicPressure}` : undefined],
    ['SpO2', vitalSigns.oxygenSaturation ? `${vitalSigns.oxygenSaturation}%` : undefined],
    ['Peso/Talla', vitalSigns.weightKg && vitalSigns.heightCm ? `${vitalSigns.weightKg} kg · ${vitalSigns.heightCm} cm` : undefined],
    ['IMC', vitalSigns.bmi ? String(vitalSigns.bmi) : undefined],
    ['Dolor', vitalSigns.painScale !== undefined ? `${vitalSigns.painScale}/10` : undefined],
  ].filter(([, value]) => value);
  return (
    <AppCard>
      <Text style={styles.title}>Signos vitales</Text>
      <View style={styles.grid}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.metric}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
          </View>
        ))}
      </View>
      <ClinicalAlerts vitalSigns={vitalSigns} />
      {vitalSigns.notes ? <Text style={styles.description}>{vitalSigns.notes}</Text> : null}
    </AppCard>
  );
}

export function TriageCard({ onPress, triage }: { onPress?: () => void; triage: NurseTriage }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Text style={styles.title}>{triage.patient.name}</Text>
            <Text style={styles.meta}>{triage.chiefComplaint || 'Evaluación inicial registrada'}</Text>
          </View>
          <StatusBadge label={priorityLabel(triage.priority)} status={triage.priority} />
        </View>
        <Text style={styles.description}>{triage.initialAssessment || triage.notes || 'Sin notas adicionales.'}</Text>
        <Text style={styles.small}>{triage.completedAt || triage.createdAt || 'Fecha no disponible'}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alertBox: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    marginTop: 12,
    padding: 12,
  },
  alertHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  alertText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  alertTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
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
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  grow: {
    flex: 1,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  metric: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    minWidth: '46%',
    padding: 10,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  metricValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  small: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
