import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { createClinicStaff, getAdminSpecialties } from '@/features/admin/services/adminService';
import type { AdminSpecialty, CreateClinicUserPayload } from '@/features/admin/types/admin.types';

const roles = [
  { description: 'Acceso a triaje, signos vitales y hospitalización.', label: 'Enfermería', value: 'enfermera' },
  { description: 'Acceso a citas, admisiones y atención inicial.', label: 'Recepción', value: 'recepcionista' },
  { description: 'Acceso a pacientes, consulta médica y expediente.', label: 'Doctor', value: 'medico' },
] as const;

type StaffRole = (typeof roles)[number]['value'];

type FormState = {
  confirmPassword: string;
  duration: string;
  email: string;
  fullName: string;
  license: string;
  password: string;
  phone: string;
  role: StaffRole;
  specialtyId: number | null;
  title: string;
  virtualCare: boolean;
};

const initialForm: FormState = {
  confirmPassword: '',
  duration: '30',
  email: '',
  fullName: '',
  license: '',
  password: '',
  phone: '',
  role: 'enfermera',
  specialtyId: null,
  title: '',
  virtualCare: false,
};

export function AdminCreateStaffScreen() {
  const navigation = useNavigation<any>();
  const [form, setForm] = useState<FormState>(initialForm);
  const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoadingCatalogs(true);
      getAdminSpecialties()
        .then((items) => {
          if (!mounted) return;
          setSpecialties(items);
          if (!form.specialtyId && items[0]?.id) setForm((current) => ({ ...current, specialtyId: items[0].id }));
        })
        .catch(() => setSpecialties([]))
        .finally(() => mounted && setLoadingCatalogs(false));
      return () => {
        mounted = false;
      };
    }, [form.specialtyId]),
  );

  if (loadingCatalogs) return <LoadingState label="Preparando formulario..." />;

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    const validation = validateForm(form);
    if (validation) {
      Alert.alert('Equipo', validation);
      return;
    }

    setSaving(true);
    try {
      const payload: CreateClinicUserPayload = {
        email: form.email.trim().toLowerCase(),
        is_active: true,
        nombre_completo: form.fullName.trim(),
        password: form.password,
        role: form.role,
        telefono: form.phone.trim() || undefined,
      };
      await createClinicStaff(
        payload,
        form.role === 'medico'
          ? {
              atiende_presencial: true,
              atiende_virtual: form.virtualCare,
              duracion_consulta_minutos: Number(form.duration || 30),
              numero_colegiacion: form.license.trim(),
              specialty: Number(form.specialtyId),
              tarifa_consulta: '0.00',
              titulo_profesional: form.title.trim() || 'Médico general',
            }
          : undefined,
      );
      Alert.alert('Equipo', 'Usuario creado correctamente.', [
        {
          text: 'Ver equipo',
          onPress: () => navigation.navigate('AdminUsersList', { refreshAt: Date.now() }),
        },
      ]);
      setForm(initialForm);
    } catch (err) {
      Alert.alert('No se pudo crear', err instanceof Error ? err.message : 'Revisa los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppHeader icon="account-plus-outline" subtitle="Alta controlada de personal de clínica." title="Crear usuario" />

            <AppCard style={styles.form}>
              <Text style={styles.label}>Rol</Text>
              <View style={styles.roleGrid}>
                {roles.map((role) => (
                  <Text
                    key={role.value}
                    onPress={() => update({ role: role.value })}
                    style={[styles.roleChip, form.role === role.value && styles.roleChipActive, form.role === role.value && styles.roleChipTextActive]}>
                    {role.label}
                  </Text>
                ))}
              </View>
              <Text style={styles.helper}>{roles.find((role) => role.value === form.role)?.description}</Text>

              <AppInput autoCapitalize="words" label="Nombre completo" onChangeText={(value) => update({ fullName: value })} sanitizer="name" value={form.fullName} />
              <AppInput autoCapitalize="none" keyboardType="email-address" label="Correo" onChangeText={(value) => update({ email: value })} sanitizer="email" value={form.email} />
              <AppInput keyboardType="phone-pad" label="Teléfono" maxLength={20} onChangeText={(value) => update({ phone: value })} sanitizer="phone" value={form.phone} />
              <AppInput label="Contraseña temporal" onChangeText={(value) => update({ password: value })} secureTextEntry value={form.password} />
              <AppInput label="Confirmar contraseña" onChangeText={(value) => update({ confirmPassword: value })} secureTextEntry value={form.confirmPassword} />

              {form.role === 'medico' ? (
                <>
                  <Text style={styles.label}>Especialidad</Text>
                  <View style={styles.roleGrid}>
                    {specialties.length === 0 ? <Text style={styles.helper}>No hay especialidades activas configuradas.</Text> : null}
                    {specialties.map((specialty) => {
                      const active = form.specialtyId === specialty.id;
                      return (
                        <Text key={specialty.id} onPress={() => update({ specialtyId: specialty.id })} style={[styles.specialtyChip, active && styles.roleChipActive, active && styles.roleChipTextActive]}>
                          {specialty.nombre ?? specialty.name ?? 'Especialidad'}
                        </Text>
                      );
                    })}
                  </View>
                  <AppInput label="Número de colegiación" onChangeText={(value) => update({ license: value })} value={form.license} />
                  <AppInput autoCapitalize="words" label="Título profesional" onChangeText={(value) => update({ title: value })} placeholder="Médico general" sanitizer="name" value={form.title} />
                  <AppInput keyboardType="number-pad" label="Duración consulta (minutos)" onChangeText={(value) => update({ duration: value })} sanitizer="digits" value={form.duration} />
                  <Text onPress={() => update({ virtualCare: !form.virtualCare })} style={[styles.toggle, form.virtualCare && styles.toggleActive]}>
                    {form.virtualCare ? 'Atiende virtual: Sí' : 'Atiende virtual: No'}
                  </Text>
                </>
              ) : null}

              <AppButton label="Crear usuario" loading={saving} onPress={submit} />
            </AppCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function validateForm(form: FormState) {
  const email = form.email.trim().toLowerCase();
  const phone = phoneDigits(form.phone);
  const passwordError = validatePasswordPair(form.password, form.confirmPassword);

  if (form.fullName.trim().length < 5) return 'Ingresa el nombre completo.';
  if (!isValidEmail(email)) return 'Ingresa un correo válido.';
  if (!isValidPhone(phone)) return 'El teléfono debe tener entre 8 y 15 dígitos.';
  if (passwordError) return passwordError.replace('La contraseña', 'La contraseña temporal');
  if (form.role === 'medico') {
    if (!form.specialtyId) return 'Selecciona una especialidad para el médico.';
    if (form.license.trim().length < 3) return 'Ingresa el número de colegiación.';
    const duration = Number(form.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 480) return 'La duración de consulta debe estar entre 1 y 480 minutos.';
  }
  return '';
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 130,
  },
  form: {
    gap: 14,
  },
  helper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  keyboard: {
    flex: 1,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  roleChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipTextActive: {
    color: colors.white,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  specialtyChip: {
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
});
