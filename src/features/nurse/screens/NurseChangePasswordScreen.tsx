import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { validatePasswordPair } from '@/core/utils/formValidation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { changePasswordService } from '@/features/auth/services/authService';
import type { ChangePasswordPayload } from '@/features/auth/types/auth.types';

const initialValues: ChangePasswordPayload = {
  confirm_password: '',
  current_password: '',
  new_password: '',
};

export function NurseChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const [values, setValues] = useState<ChangePasswordPayload>(initialValues);
  const [saving, setSaving] = useState(false);

  function update(field: keyof ChangePasswordPayload, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    if (saving) return;
    const validation = validatePasswordPair(values.new_password, values.confirm_password, values.current_password);
    if (validation) return Alert.alert('Cambiar contraseña', validation);
    setSaving(true);
    try {
      await changePasswordService(values);
      setValues(initialValues);
      Alert.alert('Contraseña actualizada', 'Contraseña actualizada correctamente. Por seguridad inicia sesión nuevamente.', [
        { onPress: signOut, text: 'Aceptar' },
      ]);
    } catch (err) {
      Alert.alert('Cambiar contraseña', err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AppHeader icon="key-outline" subtitle="Protege el acceso de enfermería." title="Cambiar contraseña" />
          <AppCard style={styles.card}>
            <AppInput label="Contraseña actual" onChangeText={(value) => update('current_password', value)} secureTextEntry value={values.current_password} />
            <AppInput label="Nueva contraseña" onChangeText={(value) => update('new_password', value)} secureTextEntry value={values.new_password} />
            <AppInput label="Confirmar contraseña" onChangeText={(value) => update('confirm_password', value)} secureTextEntry value={values.confirm_password} />
            <AppButton disabled={saving} label="Actualizar contraseña" loading={saving} onPress={submit} />
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
