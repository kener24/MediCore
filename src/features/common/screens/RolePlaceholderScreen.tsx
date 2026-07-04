import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';

interface RolePlaceholderScreenProps {
  description: string;
  title: string;
}

export function RolePlaceholderScreen({ description, title }: RolePlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader icon="tools" subtitle={description} title={title} />
      <AppCard style={styles.card}>
        <Text style={styles.title}>Listo para integrar APIs</Text>
        <Text style={styles.text}>
          Esta pantalla queda reservada para conectar datos reales del backend según permisos.
        </Text>
      </AppCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 22,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 22,
  },
  text: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
});
