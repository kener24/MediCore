import { useNavigation, useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { updateReceptionProfile } from '@/features/reception/services/receptionProfileService';
import type { ReceptionProfile } from '@/features/reception/types/receptionProfile.types';

export function ReceptionEditProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { profile?: ReceptionProfile }, [route.params]);
  const profile = params.profile;
  const split = splitName(profile?.nombre_completo);
  const [firstName, setFirstName] = useState(split.first);
  const [lastName, setLastName] = useState(split.last);
  const [phone, setPhone] = useState(profile?.telefono ?? '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const validation = validate(firstName, phone);
    if (validation) return Alert.alert('Editar perfil', validation);
    setSaving(true);
    try {
      await updateReceptionProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(), telefono: phone.trim() });
      Alert.alert('Perfil', 'Perfil actualizado correctamente.', [{ onPress: () => navigation.goBack(), text: 'Aceptar' }]);
    } catch (err) {
      Alert.alert('Editar perfil', err instanceof Error ? err.message : 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AppHeader icon="account-edit-outline" subtitle="Actualiza tus datos de contacto." title="Editar perfil" />
          <AppCard style={styles.card}>
            <AppInput label="Nombre" onChangeText={setFirstName} value={firstName} />
            <AppInput label="Apellido" onChangeText={setLastName} value={lastName} />
            <AppInput keyboardType="phone-pad" label="Teléfono" onChangeText={setPhone} value={phone} />
            <Text style={styles.hint}>Correo, rol y clínica deben ser actualizados por administración.</Text>
            <AppButton label="Guardar cambios" loading={saving} onPress={submit} />
            <AppButton label="Cancelar" onPress={() => navigation.goBack()} variant="secondary" />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function validate(firstName: string, phone: string) {
  if (!firstName.trim()) return 'El nombre es obligatorio.';
  if (phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) return 'Ingresa un teléfono válido.';
  return '';
}

function splitName(name?: string) {
  const parts = (name ?? '').trim().split(' ').filter(Boolean);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
