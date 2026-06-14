import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  label: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
});
