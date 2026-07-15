import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/core/theme/colors';

export function NurseSecurityScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader icon="shield-account-outline" subtitle="La sesión usa JWT y Authorization Bearer en cada petición." title="Seguridad" />
        <AppCard>
          <Text style={styles.title}>Acceso protegido</Text>
          <Text style={styles.body}>
            El módulo de enfermería solo se abre para roles de enfermería. Pacientes, médicos, recepción, caja, administración y superadmin no entran a este flujo.
          </Text>
        </AppCard>
        <AppCard>
          <Text style={styles.title}>Alcance clínico activo</Text>
          <Text style={styles.body}>
            Puedes gestionar cola de triaje, signos vitales, evaluación inicial, pacientes internados, notas, rondas y administración de medicamentos desde los módulos habilitados.
          </Text>
        </AppCard>
        <AppCard>
          <Text style={styles.title}>Buenas prácticas</Text>
          <Text style={styles.body}>
            Cierra sesión al terminar turno, confirma siempre el paciente antes de guardar signos vitales y evita compartir tu usuario con otro miembro del equipo.
          </Text>
        </AppCard>
        <AppButton label="Cambiar contraseña" onPress={() => navigation.navigate('NurseChangePassword')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 110,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
