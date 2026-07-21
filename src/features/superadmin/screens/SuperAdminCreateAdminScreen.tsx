import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { isValidEmail, isValidPhone, phoneDigits, validatePasswordPair } from '@/core/utils/formValidation';
import {
  clinicName,
  createSuperAdminClinicAdmin,
  getClinicAdminRoleId,
  getSuperAdminClinics,
} from '@/features/superadmin/services/superAdminService';
import type { SuperAdminClinic } from '@/features/superadmin/types/superAdmin.types';

type RouteParams = { clinicId?: number | string };

type FormState = {
  clinicId: number | null;
  confirmPassword: string;
  email: string;
  fullName: string;
  password: string;
  phone: string;
};

export function SuperAdminCreateAdminScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as RouteParams;
  const [clinics, setClinics] = useState<SuperAdminClinic[]>([]);
  const [form, setForm] = useState<FormState>({ clinicId: params.clinicId ? Number(params.clinicId) : null, confirmPassword: '', email: '', fullName: '', password: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getSuperAdminClinics({ activo: true });
      setClinics(items.filter((clinic) => clinic.activo !== false));
      if (!form.clinicId && items[0]?.id) setForm((current) => ({ ...current, clinicId: items[0].id }));
    } catch (err) {
      Alert.alert('Administradores', err instanceof Error ? err.message : 'No se pudieron cargar las clínicas.');
    } finally {
      setLoading(false);
    }
  }, [form.clinicId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    if (saving) return;
    const validation = validateForm(form);
    if (validation) return Alert.alert('Administradores', validation);
    setSaving(true);
    try {
      const role = await getClinicAdminRoleId();
      await createSuperAdminClinicAdmin({
        clinica: Number(form.clinicId),
        email: form.email.trim().toLowerCase(),
        is_active: true,
        nombre_completo: form.fullName.trim(),
        password: form.password,
        role,
        telefono: phoneDigits(form.phone),
      });
      Alert.alert('Administradores', 'Administrador de clínica creado correctamente.', [{ text: 'Volver', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('No se pudo crear', err instanceof Error ? err.message : 'Revisa los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando clínicas..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppHeader icon="account-star-outline" subtitle="Alta de administradores asignados a una clínica." title="Crear admin de clínica" />
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
            <AppCard style={styles.form}>
              <Text style={styles.label}>Clínica</Text>
              <View style={styles.chipRow}>
                {clinics.map((clinic) => {
                  const active = form.clinicId === clinic.id;
                  return (
                    <Text key={clinic.id} onPress={() => update({ clinicId: clinic.id })} style={[styles.chip, active && styles.chipActive, active && styles.chipActiveText]}>
                      {clinicName(clinic)}
                    </Text>
                  );
                })}
              </View>
              <AppInput autoCapitalize="words" label="Nombre completo" onChangeText={(value) => update({ fullName: value })} sanitizer="name" value={form.fullName} />
              <AppInput autoCapitalize="none" keyboardType="email-address" label="Correo" onChangeText={(value) => update({ email: value })} sanitizer="email" value={form.email} />
              <AppInput keyboardType="phone-pad" label="Teléfono" onChangeText={(value) => update({ phone: value })} sanitizer="phone" value={form.phone} />
              <AppInput label="Contraseña temporal" onChangeText={(value) => update({ password: value })} secureTextEntry value={form.password} />
              <AppInput label="Confirmar contraseña" onChangeText={(value) => update({ confirmPassword: value })} secureTextEntry value={form.confirmPassword} />
              <AppButton disabled={saving || clinics.length === 0} label="Crear administrador" loading={saving} onPress={submit} />
            </AppCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function validateForm(form: FormState) {
  if (!form.clinicId) return 'Selecciona una clínica activa.';
  if (form.fullName.trim().length < 5) return 'Ingresa el nombre completo.';
  if (!isValidEmail(form.email.trim().toLowerCase())) return 'Ingresa un correo válido.';
  if (!isValidPhone(phoneDigits(form.phone), true)) return 'El teléfono debe tener entre 8 y 15 dígitos.';
  return validatePasswordPair(form.password, form.confirmPassword).replace('La contraseña', 'La contraseña temporal');
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipActiveText: { color: colors.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  safe: { backgroundColor: colors.background, flex: 1 },
});
