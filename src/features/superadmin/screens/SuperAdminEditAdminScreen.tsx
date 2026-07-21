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
import { isValidEmail, isValidPhone, phoneDigits } from '@/core/utils/formValidation';
import {
  clinicName,
  getClinicAdminRoleId,
  getSuperAdminClinics,
  getSuperAdminUser,
  updateSuperAdminClinicAdmin,
} from '@/features/superadmin/services/superAdminService';
import type { SuperAdminClinic } from '@/features/superadmin/types/superAdmin.types';

type RouteParams = { userId?: number | string };
type FormState = { clinicId: number | null; email: string; fullName: string; phone: string };

export function SuperAdminEditAdminScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { userId } = (route.params ?? {}) as RouteParams;
  const [clinics, setClinics] = useState<SuperAdminClinic[]>([]);
  const [form, setForm] = useState<FormState>({ clinicId: null, email: '', fullName: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      Alert.alert('Administradores', 'No se recibió el administrador a editar.');
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const [user, clinicItems] = await Promise.all([getSuperAdminUser(userId), getSuperAdminClinics()]);
      setClinics(clinicItems.filter((clinic) => clinic.activo !== false || clinic.id === user.clinica));
      setForm({
        clinicId: user.clinica ?? null,
        email: user.email,
        fullName: user.nombre_completo ?? '',
        phone: user.telefono ?? '',
      });
    } catch (err) {
      Alert.alert('Administradores', err instanceof Error ? err.message : 'No se pudo cargar el administrador.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation, userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    if (!userId || saving) return;
    const validation = validateForm(form);
    if (validation) return Alert.alert('Administradores', validation);
    setSaving(true);
    try {
      const role = await getClinicAdminRoleId();
      await updateSuperAdminClinicAdmin(userId, {
        clinica: Number(form.clinicId),
        email: form.email.trim().toLowerCase(),
        nombre_completo: form.fullName.trim(),
        role,
        telefono: phoneDigits(form.phone),
      });
      Alert.alert('Administradores', 'Administrador actualizado correctamente.', [{ text: 'Volver', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Revisa los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando administrador..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppHeader icon="account-edit-outline" subtitle="Datos del administrador de clínica." title="Editar admin" />
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
            <AppCard style={styles.form}>
              <Text style={styles.label}>Clínica asignada</Text>
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
              <AppButton disabled={saving} label="Guardar cambios" loading={saving} onPress={submit} />
            </AppCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function validateForm(form: FormState) {
  if (!form.clinicId) return 'Selecciona una clínica.';
  if (form.fullName.trim().length < 5) return 'Ingresa el nombre completo.';
  if (!isValidEmail(form.email.trim().toLowerCase())) return 'Ingresa un correo válido.';
  if (!isValidPhone(phoneDigits(form.phone), true)) return 'El teléfono debe tener entre 8 y 15 dígitos.';
  return '';
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
