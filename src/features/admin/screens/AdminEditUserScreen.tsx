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
  adminUserName,
  adminUserRole,
  findAdminDoctorProfileForUser,
  getAdminSpecialties,
  getAdminUser,
  updateAdminDoctorProfile,
  updateAdminUser,
} from '@/features/admin/services/adminService';
import type { AdminDoctorProfile, AdminSpecialty } from '@/features/admin/types/admin.types';

const roles = [
  { label: 'Admin', value: 'admin' },
  { label: 'Doctor', value: 'medico' },
  { label: 'Enfermería', value: 'enfermera' },
  { label: 'Recepción', value: 'recepcionista' },
  { label: 'Paciente', value: 'paciente' },
] as const;

type StaffRole = (typeof roles)[number]['value'];
type RouteParams = { userId?: number | string };

type FormState = {
  email: string;
  fullName: string;
  phone: string;
  role: StaffRole;
  specialtyId: number | null;
  license: string;
  title: string;
  duration: string;
  fee: string;
  virtualCare: boolean;
  inPersonCare: boolean;
};

export function AdminEditUserScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { userId } = (route.params ?? {}) as RouteParams;
  const [form, setForm] = useState<FormState | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<AdminDoctorProfile | null>(null);
  const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      Alert.alert('Equipo', 'No se recibió el usuario a editar.');
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const [user, specialtyItems] = await Promise.all([getAdminUser(userId), getAdminSpecialties().catch(() => [])]);
      const profile = String(adminUserRole(user)).toLowerCase().includes('medico') ? await findAdminDoctorProfileForUser(user).catch(() => null) : null;
      setSpecialties(specialtyItems);
      setDoctorProfile(profile);
      setForm({
        duration: String(profile?.duracion_consulta_minutos ?? 30),
        email: user.email,
        fee: String(profile?.tarifa_consulta ?? '0.00'),
        fullName: adminUserName(user),
        inPersonCare: profile?.atiende_presencial ?? true,
        license: profile?.numero_colegiacion ?? '',
        phone: user.telefono ?? user.phone ?? '',
        role: roleValue(adminUserRole(user)),
        specialtyId: profile?.specialty ?? specialtyItems[0]?.id ?? null,
        title: profile?.titulo_profesional ?? '',
        virtualCare: profile?.atiende_virtual ?? false,
      });
    } catch (err) {
      Alert.alert('Equipo', err instanceof Error ? err.message : 'No se pudo cargar el usuario.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation, userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (patch: Partial<FormState>) => setForm((current) => current ? { ...current, ...patch } : current);

  async function submit() {
    if (!form || !userId || saving) return;
    const validation = validateForm(form, doctorProfile);
    if (validation) {
      Alert.alert('Equipo', validation);
      return;
    }
    setSaving(true);
    try {
      await updateAdminUser(userId, {
        email: form.email.trim().toLowerCase(),
        nombre_completo: form.fullName.trim(),
        role: form.role,
        telefono: phoneDigits(form.phone),
      });
      if (doctorProfile && form.role === 'medico') {
        await updateAdminDoctorProfile(doctorProfile.id, {
          atiende_presencial: form.inPersonCare,
          atiende_virtual: form.virtualCare,
          duracion_consulta_minutos: Number(form.duration),
          numero_colegiacion: form.license.trim(),
          specialty: Number(form.specialtyId),
          tarifa_consulta: Number(form.fee || 0).toFixed(2),
          titulo_profesional: form.title.trim() || 'Médico general',
        });
      }
      Alert.alert('Equipo', 'Usuario actualizado correctamente.', [{ text: 'Ver detalle', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Revisa los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) return <LoadingState label="Cargando edición..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppHeader icon="account-edit-outline" subtitle="Actualiza datos, rol y perfil operativo." title="Editar usuario" />
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />

            <AppCard style={styles.form}>
              <Text style={styles.label}>Rol</Text>
              <View style={styles.chipRow}>
                {roles.map((role) => (
                  <Text key={role.value} onPress={() => update({ role: role.value })} style={[styles.chip, form.role === role.value && styles.chipActive, form.role === role.value && styles.chipActiveText]}>
                    {role.label}
                  </Text>
                ))}
              </View>

              <AppInput autoCapitalize="words" label="Nombre completo" onChangeText={(value) => update({ fullName: value })} sanitizer="name" value={form.fullName} />
              <AppInput autoCapitalize="none" keyboardType="email-address" label="Correo" onChangeText={(value) => update({ email: value })} sanitizer="email" value={form.email} />
              <AppInput keyboardType="phone-pad" label="Teléfono" maxLength={20} onChangeText={(value) => update({ phone: value })} sanitizer="phone" value={form.phone} />

              {form.role === 'medico' ? (
                <>
                  {!doctorProfile ? <Text style={styles.warning}>Este usuario no tiene perfil médico creado. Puedes cambiar datos generales, pero el perfil médico debe crearse desde el alta de personal.</Text> : null}
                  <Text style={styles.label}>Especialidad</Text>
                  <View style={styles.chipRow}>
                    {specialties.map((specialty) => {
                      const active = form.specialtyId === specialty.id;
                      return (
                        <Text key={specialty.id} onPress={() => update({ specialtyId: specialty.id })} style={[styles.chip, active && styles.chipActive, active && styles.chipActiveText]}>
                          {specialty.nombre ?? specialty.name ?? 'Especialidad'}
                        </Text>
                      );
                    })}
                  </View>
                  <AppInput label="Número de colegiación" onChangeText={(value) => update({ license: value })} value={form.license} />
                  <AppInput autoCapitalize="words" label="Título profesional" onChangeText={(value) => update({ title: value })} sanitizer="name" value={form.title} />
                  <AppInput keyboardType="number-pad" label="Duración consulta (minutos)" onChangeText={(value) => update({ duration: value })} sanitizer="digits" value={form.duration} />
                  <AppInput keyboardType="decimal-pad" label="Tarifa consulta" onChangeText={(value) => update({ fee: value.replace(/[^0-9.]/g, '') })} value={form.fee} />
                  <Text onPress={() => update({ inPersonCare: !form.inPersonCare })} style={[styles.toggle, form.inPersonCare && styles.toggleActive]}>
                    {form.inPersonCare ? 'Atiende presencial: Sí' : 'Atiende presencial: No'}
                  </Text>
                  <Text onPress={() => update({ virtualCare: !form.virtualCare })} style={[styles.toggle, form.virtualCare && styles.toggleActive]}>
                    {form.virtualCare ? 'Atiende virtual: Sí' : 'Atiende virtual: No'}
                  </Text>
                </>
              ) : null}

              <AppButton disabled={saving} label="Guardar cambios" loading={saving} onPress={submit} />
            </AppCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function roleValue(role: string): StaffRole {
  const normalized = role.toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('medico')) return 'medico';
  if (normalized.includes('enfermera')) return 'enfermera';
  if (normalized.includes('recepcionista')) return 'recepcionista';
  if (normalized.includes('paciente')) return 'paciente';
  return 'recepcionista';
}

function validateForm(form: FormState, doctorProfile: AdminDoctorProfile | null) {
  const email = form.email.trim().toLowerCase();
  const phone = phoneDigits(form.phone);
  if (form.fullName.trim().length < 5) return 'Ingresa el nombre completo.';
  if (!isValidEmail(email)) return 'Ingresa un correo válido.';
  if (!isValidPhone(phone)) return 'El teléfono debe tener entre 8 y 15 dígitos.';
  if (form.role === 'medico' && doctorProfile) {
    if (!form.specialtyId) return 'Selecciona una especialidad.';
    if (form.license.trim().length < 3) return 'Ingresa el número de colegiación.';
    const duration = Number(form.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 480) return 'La duración debe estar entre 1 y 480 minutos.';
    const fee = Number(form.fee || 0);
    if (!Number.isFinite(fee) || fee < 0) return 'La tarifa no puede ser negativa.';
  }
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
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipActiveText: {
    color: colors.white,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 130,
  },
  form: {
    gap: 14,
  },
  keyboard: {
    flex: 1,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  toggle: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '900',
    overflow: 'hidden',
    padding: 14,
    textAlign: 'center',
  },
  toggleActive: {
    backgroundColor: colors.palePrimary,
    borderColor: colors.primary,
    color: colors.primaryDark,
  },
  warning: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});
