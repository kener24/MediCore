import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';

export function UnsupportedRoleScreen() {
  const { role, signOut, user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <MaterialCommunityIcons color={colors.primary} name="account-lock-outline" size={34} />
        </View>
        <Text style={styles.title}>Rol no habilitado</Text>
        <Text style={styles.message}>
          {user?.nombre_completo ?? 'Este usuario'} inicio sesion correctamente, pero el rol
          <Text style={styles.roleName}> {role ?? 'sin rol'} </Text>
          aun no tiene panel movil activo.
        </Text>
        <AppButton label="Cerrar sesion" onPress={signOut} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    margin: 22,
    padding: 22,
  },
  icon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 22,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  roleName: {
    color: colors.ink,
    fontWeight: '900',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
});
