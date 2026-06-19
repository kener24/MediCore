import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';

export function ReceptionSecurityScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="shield-lock-outline" subtitle="Permisos aplicados desde backend y navegación." title="Seguridad recepción" />
        <AppCard style={styles.card}>
          <Text style={styles.text}>Recepción solo puede buscar pacientes, crear admisiones, hacer check-in y revisar visitas operativas de su clínica.</Text>
          <Text style={styles.text}>No registra signos vitales, consultas médicas, medicamentos, notas clínicas profundas ni altas hospitalarias.</Text>
          <Text style={styles.text}>Si el servidor responde 401 se limpia la sesión y se vuelve al login.</Text>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
