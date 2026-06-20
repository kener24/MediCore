import { useNavigation } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';

export function CashierSecurityScreen() {
  const navigation = useNavigation<any>();
  const { role, signOut, user } = useAuth();

  function logout() {
    Alert.alert('Cerrar sesion', 'Deseas cerrar la sesion?', [
      { style: 'cancel', text: 'Cancelar' },
      { style: 'destructive', text: 'Cerrar sesion', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <CashierHeader subtitle="Sesion y permisos de caja." title="Seguridad" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>Sesion activa</Text>
          <Text style={styles.text}>Correo: {user?.email ?? 'No registrado'}</Text>
          <Text style={styles.text}>Rol: {String(role ?? 'cajero')}</Text>
          <Text style={styles.text}>Clinica: {user?.clinica_nombre ?? (typeof user?.clinica === 'object' ? user.clinica?.nombre ?? 'No asignada' : 'No asignada')}</Text>
        </AppCard>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Permisos</Text>
          <Text style={styles.text}>Caja puede ver facturas, saldos y pagos necesarios para cobrar.</Text>
          <Text style={styles.text}>Caja no ve notas clinicas profundas, no registra signos vitales, no crea consultas y no administra medicamentos.</Text>
          <Text style={styles.text}>Todas las peticiones usan la sesion segura con JWT Bearer.</Text>
        </AppCard>
        <AppButton label="Cambiar contrasena" onPress={() => navigation.navigate('CashierChangePassword')} />
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppButton label="Cerrar sesion" onPress={logout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  safe: { backgroundColor: colors.background, flex: 1 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
