import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { changeReceptionPassword } from '@/features/reception/services/receptionProfileService';
import type { ReceptionChangePasswordPayload } from '@/features/reception/types/receptionProfile.types';

const initialValues: ReceptionChangePasswordPayload = {
  confirm_password: '',
  current_password: '',
  new_password: '',
};

export function ReceptionChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const [values, setValues] = useState<ReceptionChangePasswordPayload>(initialValues);
  const [saving, setSaving] = useState(false);

  function update(field: keyof ReceptionChangePasswordPayload, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    const validation = validate(values);
    if (validation) return Alert.alert('Cambiar contraseña', validation);
    setSaving(true);
    try {
      await changeReceptionPassword(values);
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
          <AppHeader icon="key-outline" subtitle="Protege el acceso de recepción." title="Cambiar contraseña" />
          <AppCard style={styles.card}>
            <AppInput label="Contraseña actual" onChangeText={(value) => update('current_password', value)} secureTextEntry value={values.current_password} />
            <AppInput label="Nueva contraseña" onChangeText={(value) => update('new_password', value)} secureTextEntry value={values.new_password} />
            <AppInput label="Confirmar contraseña" onChangeText={(value) => update('confirm_password', value)} secureTextEntry value={values.confirm_password} />
            <AppButton label="Actualizar contraseña" loading={saving} onPress={submit} />
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function validate(values: ReceptionChangePasswordPayload) {
  if (!values.current_password) return 'Escribe tu contraseña actual.';
  if (!values.new_password || values.new_password.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
  if (values.new_password !== values.confirm_password) return 'Las contraseñas no coinciden.';
  if (values.new_password === values.current_password) return 'La nueva contraseña debe ser diferente a la actual.';
  return '';
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
