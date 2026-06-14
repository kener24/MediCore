import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

interface StatCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  tone?: 'primary' | 'blue' | 'warning';
  value: string;
}

export function StatCard({ icon, label, tone = 'primary', value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, styles[tone]]}>
        <MaterialCommunityIcons color={colors.white} name={icon} size={20} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blue: {
    backgroundColor: colors.medicalBlue,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minWidth: 132,
    padding: 14,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginBottom: 12,
    width: 38,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  value: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  warning: {
    backgroundColor: colors.warning,
  },
});
