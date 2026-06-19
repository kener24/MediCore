import { StyleSheet, Text } from 'react-native';

import { colors } from '@/core/theme/colors';
import type { BedStatus, HospitalizationStatus } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const hospitalizationLabels: Record<string, string> = {
  active: 'Activo',
  cancelled: 'Cancelado',
  discharged: 'Alta',
  observation: 'Observación',
  transferred: 'Trasladado',
};

const bedLabels: Record<string, string> = {
  available: 'Disponible',
  blocked: 'Bloqueada',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
  occupied: 'Ocupada',
};

function styleFor(status?: string) {
  if (status === 'available' || status === 'active') return styles.success;
  if (status === 'observation' || status === 'cleaning') return styles.warning;
  if (status === 'occupied' || status === 'transferred') return styles.blue;
  if (status === 'maintenance' || status === 'blocked' || status === 'cancelled') return styles.danger;
  return styles.neutral;
}

export function HospitalizationStatusBadge({ status }: { status?: HospitalizationStatus }) {
  const value = String(status ?? '').toLowerCase();
  return <Text style={[styles.badge, styleFor(value)]}>{hospitalizationLabels[value] ?? 'Sin estado'}</Text>;
}

export function BedStatusBadge({ status }: { status?: BedStatus }) {
  const value = String(status ?? '').toLowerCase();
  return <Text style={[styles.badge, styleFor(value)]}>{bedLabels[value] ?? 'Sin estado'}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  blue: {
    backgroundColor: '#DBEAFE',
    color: colors.medicalBlue,
  },
  danger: {
    backgroundColor: '#FEE2E2',
    color: colors.danger,
  },
  neutral: {
    backgroundColor: '#E2E8F0',
    color: colors.muted,
  },
  success: {
    backgroundColor: '#DCFCE7',
    color: colors.success,
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color: colors.warning,
  },
});
