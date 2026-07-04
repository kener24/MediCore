import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

type Target = 'schedule' | 'waitingRoom' | 'consultations' | 'notifications' | 'profile';

const actions: {
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  target: Target;
}[] = [
  { description: 'Citas programadas de hoy', icon: 'calendar-account-outline', label: 'Agenda', target: 'schedule' },
  { description: 'Pacientes listos para médico', icon: 'account-clock-outline', label: 'Sala', target: 'waitingRoom' },
  { description: 'Atenciones en curso', icon: 'stethoscope', label: 'Consultas', target: 'consultations' },
  { description: 'Avisos clínicos', icon: 'bell-outline', label: 'Notificaciónes', target: 'notifications' },
  { description: 'Datos de cuenta', icon: 'account-circle-outline', label: 'Perfil', target: 'profile' },
];

export function DoctorQuickActions({ onNavigate }: { onNavigate: (target: Target) => void }) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable key={action.target} onPress={() => onNavigate(action.target)} style={styles.card}>
          <MaterialCommunityIcons color={colors.primary} name={action.icon} size={24} />
          <View style={styles.copy}>
            <Text style={styles.label}>{action.label}</Text>
            <Text style={styles.description}>{action.description}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  copy: { flex: 1, gap: 3 },
  description: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  grid: { gap: 10 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '900' },
});
