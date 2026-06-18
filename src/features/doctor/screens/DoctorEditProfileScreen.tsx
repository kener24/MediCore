import { useNavigation, useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { updateDoctorProfile } from '@/features/doctor/services/doctorProfileService';
import type { DoctorProfile } from '@/features/doctor/types/doctorProfile.types';

export function DoctorEditProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { profile?: DoctorProfile }, [route.params]);
  const profile = params.profile;
  const [firstName, setFirstName] = useState(profile?.first_name ?? splitName(profile).first);
  const [lastName, setLastName] = useState(profile?.last_name ?? splitName(profile).last);
  const [phone, setPhone] = useState(profile?.phone ?? profile?.telefono ?? '');
  const [biography, setBiography] = useState(profile?.professional?.biography ?? profile?.professional?.biografia ?? '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const validation = validate();
    if (validation) return Alert.alert('Editar perfil', validation);
    setSaving(true);
    try {
      await updateDoctorProfile({ biography, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() });
      Alert.alert('Perfil médico', 'Perfil actualizado correctamente.', [{ onPress: () => navigation.goBack(), text: 'Aceptar' }]);
    } catch (err) {
      Alert.alert('Perfil médico', err instanceof Error ? err.message : 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  }

  function validate() {
    if (!firstName.trim()) return 'El nombre es obligatorio.';
    if (phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) return 'Ingresa un teléfono válido.';
    if (biography.length > 1000) return 'La biografía no puede superar 1000 caracteres.';
    return '';
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DoctorHeader title="Editar perfil" />
          <AppCard style={styles.card}>
            <AppInput label="Nombre" onChangeText={setFirstName} value={firstName} />
            <AppInput label="Apellido" onChangeText={setLastName} value={lastName} />
            <AppInput keyboardType="phone-pad" label="Teléfono" onChangeText={setPhone} value={phone} />
            <AppInput
              label="Biografía profesional"
              multiline
              onChangeText={setBiography}
              scrollEnabled={false}
              style={styles.textArea}
              value={biography}
            />
            <Text style={styles.hint}>Rol, clínica, especialidad y tarifa deben ser actualizados por administración.</Text>
            <AppButton label="Guardar cambios" loading={saving} onPress={submit} />
            <AppButton label="Cancelar" onPress={() => navigation.goBack()} variant="secondary" />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function splitName(profile?: DoctorProfile) {
  const parts = (profile?.full_name ?? profile?.nombre_completo ?? '').trim().split(' ').filter(Boolean);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  keyboard: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
});
