import { useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';
import { toPositiveId } from '@/core/utils/idUtils';

export function NurseMedicationAdministrationFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hospitalizationId = toPositiveId(route.params?.hospitalizationId);
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.content}>
        <AppHeader icon="pill" subtitle="Flujo clínico protegido" title="Administración de medicamentos" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>La programación corresponde al médico</Text>
          <Text style={styles.body}>Enfermería administra únicamente las dosis creadas desde una indicación médica activa. Esto conserva la prescripción, evita duplicados y garantiza el descuento correcto de inventario.</Text>
          <AppButton label="Ver dosis programadas" onPress={() => navigation.navigate('NurseMedicationAdministrations', { hospitalizationId })} />
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { gap: 14 },
  content: { gap: 14, padding: 18 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900' },
});
