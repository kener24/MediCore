import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';
import { validatePasswordPair } from '@/core/utils/formValidation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ChangePasswordForm } from '@/features/doctor/components/DoctorProfileCards';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { changePassword } from '@/features/doctor/services/doctorProfileService';
import type { ChangePasswordPayload } from '@/features/doctor/types/doctorProfile.types';

const initialValues: ChangePasswordPayload = {
  confirm_password: '',
  current_password: '',
  new_password: '',
};

export function DoctorChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const [values, setValues] = useState<ChangePasswordPayload>(initialValues);
  const [saving, setSaving] = useState(false);

  function update(field: keyof ChangePasswordPayload, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    const validation = validatePasswordPair(values.new_password, values.confirm_password, values.current_password);
    if (validation) return Alert.alert('Cambiar contraseña', validation);
    setSaving(true);
    try {
      await changePassword(values);
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DoctorHeader title="Cambiar contraseña" />
          <ChangePasswordForm loading={saving} onChange={update} onSubmit={submit} values={values} />
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  keyboard: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
