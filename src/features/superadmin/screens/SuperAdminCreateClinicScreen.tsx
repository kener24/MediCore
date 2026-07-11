import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { createSuperAdminClinic } from '@/features/superadmin/services/superAdminService';
import type { CreateClinicPayload } from '@/features/superadmin/types/superAdmin.types';

export function SuperAdminCreateClinicScreen() {
  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateClinicPayload>({ correo: '', direccion: '', nombre: '', rtn: '', telefono: '' });

  const update = (patch: Partial<CreateClinicPayload>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    const name = form.nombre.trim();
    const email = form.correo?.trim() || '';
    const phone = form.telefono?.replace(/\D/g, '') || '';
    const rtn = form.rtn?.replace(/\D/g, '') || '';
    if (name.length < 3) return Alert.alert('Clínica', 'Ingresa el nombre de la clínica.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Alert.alert('Clínica', 'Ingresa un correo válido.');
    if (phone && phone.length < 8) return Alert.alert('Clínica', 'El teléfono debe tener al menos 8 dígitos.');
    if (rtn && rtn.length < 8) return Alert.alert('Clínica', 'El RTN debe tener al menos 8 dígitos.');
    setSaving(true);
    try {
      await createSuperAdminClinic({ ...form, correo: email || undefined, nombre: name, rtn: rtn || undefined, telefono: form.telefono?.trim() || undefined });
      Alert.alert('Clínica', 'Clínica creada correctamente.', [{ text: 'Ver clínicas', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('No se pudo crear', err instanceof Error ? err.message : 'Revisa los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppHeader icon="domain-plus" subtitle="Alta global de clínica en el SaaS." title="Crear clínica" />
            <AppCard style={styles.form}>
              <AppInput autoCapitalize="words" label="Nombre" onChangeText={(value) => update({ nombre: value })} value={form.nombre} />
              <AppInput keyboardType="number-pad" label="RTN" onChangeText={(value) => update({ rtn: value.replace(/[^0-9]/g, '') })} value={form.rtn} />
              <AppInput keyboardType="phone-pad" label="Teléfono" onChangeText={(value) => update({ telefono: value.replace(/[^0-9+()\-\s]/g, '') })} value={form.telefono} />
              <AppInput autoCapitalize="none" keyboardType="email-address" label="Correo" onChangeText={(value) => update({ correo: value })} value={form.correo} />
              <AppInput autoCapitalize="sentences" label="Dirección" onChangeText={(value) => update({ direccion: value })} value={form.direccion} />
              <AppButton label="Crear clínica" loading={saving} onPress={submit} />
            </AppCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});

