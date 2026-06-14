import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

interface PatientHeaderProps {
  name?: string;
  subtitle?: string;
  title?: string;
}

export function PatientHeader({ name, subtitle, title = 'Hola' }: PatientHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>MediCore Paciente</Text>
      <Text style={styles.title}>{name ? `${title}, ${name}` : title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 5,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
