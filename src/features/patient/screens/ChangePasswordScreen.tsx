import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { validatePasswordPair } from '@/core/utils/formValidation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { changePasswordService } from '@/features/auth/services/authService';
import { PatientHeader } from '@/features/patient/components/PatientHeader';

export function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    const validation = validatePasswordPair(newPassword, confirmPassword, currentPassword);
    if (validation) {
      Alert.alert('Contraseña', validation);
      return;
    }
    setSubmitting(true);
    try {
      await changePasswordService({
        confirm_password: confirmPassword,
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert('Contraseña actualizada', 'Contraseña actualizada correctamente. Por seguridad inicia sesión nuevamente.', [
        { onPress: signOut, text: 'Aceptar' },
      ]);
    } catch (err) {
      Alert.alert('Contraseña', err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.content}>
      <PatientHeader subtitle="Actualiza tu acceso de forma segura." title="Cambiar contraseña" />
      <AppCard style={styles.form}>
        <AppInput
          icon="lock-outline"
          label="Contraseña actual"
          onChangeText={setCurrentPassword}
          onPressRightIcon={() => setSecureCurrent((value) => !value)}
          rightIcon={secureCurrent ? 'eye-outline' : 'eye-off-outline'}
          secureTextEntry={secureCurrent}
          value={currentPassword}
        />
        <AppInput
          icon="lock-plus-outline"
          label="Nueva contraseña"
          onChangeText={setNewPassword}
          onPressRightIcon={() => setSecureNew((value) => !value)}
          rightIcon={secureNew ? 'eye-outline' : 'eye-off-outline'}
          secureTextEntry={secureNew}
          value={newPassword}
        />
        <AppInput
          icon="lock-check-outline"
          label="Confirmar contraseña"
          onChangeText={setConfirmPassword}
          onPressRightIcon={() => setSecureConfirm((value) => !value)}
          rightIcon={secureConfirm ? 'eye-outline' : 'eye-off-outline'}
          secureTextEntry={secureConfirm}
          value={confirmPassword}
        />
        <AppButton label="Guardar cambios" loading={submitting} onPress={save} />
        <AppButton label="Cancelar" onPress={() => navigation.goBack()} variant="secondary" />
      </AppCard>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  form: { gap: 14 },
});
