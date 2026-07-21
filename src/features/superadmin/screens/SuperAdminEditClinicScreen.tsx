import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { isValidEmail, isValidPhone, isValidRtn, phoneDigits } from '@/core/utils/formValidation';
import { getSuperAdminClinic, updateSuperAdminClinic } from '@/features/superadmin/services/superAdminService';
import type { CreateClinicPayload } from '@/features/superadmin/types/superAdmin.types';

type RouteParams = { clinicId?: number | string };

export function SuperAdminEditClinicScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { clinicId } = (route.params ?? {}) as RouteParams;
  const [form, setForm] = useState<CreateClinicPayload>({ correo: '', direccion: '', nombre: '', rtn: '', telefono: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) {
      Alert.alert('Clínicas', 'No se recibió la clínica a editar.');
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const clinic = await getSuperAdminClinic(clinicId);
      setForm({
        correo: clinic.correo ?? '',
        direccion: clinic.direccion ?? '',
        nombre: clinic.nombre ?? '',
        rtn: clinic.rtn ?? '',
        telefono: clinic.telefono ?? '',
      });
    } catch (err) {
      Alert.alert('Clínicas', err instanceof Error ? err.message : 'No se pudo cargar la clínica.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [clinicId, navigation]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (patch: Partial<CreateClinicPayload>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    if (!clinicId || saving) return;
    const validation = validateClinic(form);
    if (validation) return Alert.alert('Clínicas', validation);
    setSaving(true);
    try {
      await updateSuperAdminClinic(clinicId, {
        correo: form.correo?.trim().toLowerCase() || undefined,
        direccion: form.direccion?.trim() || undefined,
        nombre: form.nombre.trim(),
        rtn: phoneDigits(form.rtn) || undefined,
        telefono: phoneDigits(form.telefono) || undefined,
      });
      Alert.alert('Clínicas', 'Clínica actualizada correctamente.', [{ text: 'Volver', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Revisa los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando clínica..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppHeader icon="domain" subtitle="Datos principales de la clínica." title="Editar clínica" />
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
            <AppCard style={styles.form}>
              <AppInput autoCapitalize="words" label="Nombre" onChangeText={(value) => update({ nombre: value })} sanitizer="name" value={form.nombre} />
              <AppInput keyboardType="number-pad" label="RTN" maxLength={14} onChangeText={(value) => update({ rtn: value })} sanitizer="rtn" value={form.rtn} />
              <AppInput keyboardType="phone-pad" label="Teléfono" onChangeText={(value) => update({ telefono: value })} sanitizer="phone" value={form.telefono} />
              <AppInput autoCapitalize="none" keyboardType="email-address" label="Correo" onChangeText={(value) => update({ correo: value })} sanitizer="email" value={form.correo} />
              <AppInput autoCapitalize="sentences" label="Dirección" multiline onChangeText={(value) => update({ direccion: value })} value={form.direccion} />
              <AppButton disabled={saving} label="Guardar cambios" loading={saving} onPress={submit} />
            </AppCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function validateClinic(form: CreateClinicPayload) {
  const name = form.nombre.trim();
  const email = form.correo?.trim().toLowerCase() || '';
  const phone = phoneDigits(form.telefono);
  const rtn = phoneDigits(form.rtn);
  if (name.length < 3) return 'Ingresa el nombre de la clínica.';
  if (email && !isValidEmail(email)) return 'Ingresa un correo válido.';
  if (!isValidPhone(phone, true)) return 'El teléfono debe tener entre 8 y 15 dígitos.';
  if (rtn && !isValidRtn(rtn)) return 'El RTN debe tener 14 dígitos.';
  if (!form.direccion?.trim() || form.direccion.trim().length < 5) return 'Ingresa una dirección válida.';
  return '';
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  form: { gap: 14 },
  keyboard: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
});
