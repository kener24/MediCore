import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { getPatientProfile, updatePatientProfile } from '@/features/patient/services/patientProfileService';
import type { PatientProfile, PatientProfileUpdatePayload } from '@/features/patient/types/patientProfile.types';

type FormState = Required<PatientProfileUpdatePayload>;

const emptyForm: FormState = {
  ciudad: '',
  contacto_emergencia_nombre: '',
  contacto_emergencia_parentesco: '',
  contacto_emergencia_telefono: '',
  departamento: '',
  direccion: '',
  email: '',
  correo: '',
  telefono: '',
};

export function PatientProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getPatientProfile();
      setProfile(data);
      setForm({
        ciudad: data.ciudad ?? '',
        contacto_emergencia_nombre: data.contacto_emergencia_nombre ?? '',
        contacto_emergencia_parentesco: data.contacto_emergencia_parentesco ?? '',
        contacto_emergencia_telefono: data.contacto_emergencia_telefono ?? '',
        departamento: data.departamento ?? '',
        direccion: data.direccion ?? '',
        email: data.email ?? '',
        correo: data.correo ?? '',
        telefono: data.telefono ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const email = form.email || form.correo;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Ingresa un correo valido.';
    }
    if (form.telefono && !/^[0-9+\-\s()]{7,20}$/.test(form.telefono)) {
      return 'Ingresa un telefono valido.';
    }
    if (form.contacto_emergencia_telefono && !/^[0-9+\-\s()]{7,20}$/.test(form.contacto_emergencia_telefono)) {
      return 'Ingresa un telefono de emergencia valido.';
    }
    return '';
  }

  async function save() {
    const validation = validate();
    if (validation) {
      Alert.alert('Perfil', validation);
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<PatientProfileUpdatePayload> = {
        ciudad: form.ciudad,
        contacto_emergencia_nombre: form.contacto_emergencia_nombre,
        contacto_emergencia_parentesco: form.contacto_emergencia_parentesco,
        contacto_emergencia_telefono: form.contacto_emergencia_telefono,
        departamento: form.departamento,
        direccion: form.direccion,
        telefono: form.telefono,
      };
      if (form.correo) payload.correo = form.correo;
      if (form.email) payload.email = form.email;
      const updated = await updatePatientProfile(payload);
      setProfile(updated);
      setEditing(false);
      Alert.alert('Perfil', 'Perfil actualizado correctamente.');
    } catch (err) {
      Alert.alert('Perfil', err instanceof Error ? err.message : 'No se pudo actualizar el perfil.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Cargando perfil..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader name={profile?.nombre_completo} subtitle="Datos personales del portal paciente." title="Perfil" />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el perfil" />
        ) : profile ? (
          <>
            <AppCard>
              <ReadOnly label="Nombre" value={profile.nombre_completo} />
              <ReadOnly label="Identidad" value={profile.identidad} />
              <ReadOnly label="Codigo paciente" value={profile.codigo_paciente} />
              <ReadOnly label="Clinica" value={profile.clinica_nombre || profile.clinic_nombre} />
            </AppCard>

            {editing ? (
              <AppCard style={styles.form}>
                <AppInput icon="phone-outline" keyboardType="phone-pad" label="Telefono" onChangeText={(v) => updateField('telefono', v)} value={form.telefono} />
                <AppInput autoCapitalize="none" icon="email-outline" keyboardType="email-address" label="Email" onChangeText={(v) => updateField(profile.email ? 'email' : 'correo', v)} value={profile.email ? form.email : form.correo} />
                <AppInput icon="map-marker-outline" label="Direccion" onChangeText={(v) => updateField('direccion', v)} value={form.direccion} />
                <AppInput icon="city" label="Ciudad" onChangeText={(v) => updateField('ciudad', v)} value={form.ciudad} />
                <AppInput icon="map-outline" label="Departamento" onChangeText={(v) => updateField('departamento', v)} value={form.departamento} />
                <AppInput icon="account-heart-outline" label="Contacto emergencia" onChangeText={(v) => updateField('contacto_emergencia_nombre', v)} value={form.contacto_emergencia_nombre} />
                <AppInput icon="phone-alert-outline" keyboardType="phone-pad" label="Telefono emergencia" onChangeText={(v) => updateField('contacto_emergencia_telefono', v)} value={form.contacto_emergencia_telefono} />
                <AppInput icon="account-group-outline" label="Parentesco" onChangeText={(v) => updateField('contacto_emergencia_parentesco', v)} value={form.contacto_emergencia_parentesco} />
                <AppButton label="Guardar cambios" loading={submitting} onPress={save} />
                <AppButton label="Cancelar edicion" onPress={() => setEditing(false)} variant="secondary" />
              </AppCard>
            ) : (
              <AppCard>
                <ReadOnly label="Telefono" value={profile.telefono} />
                <ReadOnly label="Email" value={profile.email || profile.correo} />
                <ReadOnly label="Direccion" value={profile.direccion} />
                <ReadOnly label="Ciudad" value={profile.ciudad} />
                <ReadOnly label="Departamento" value={profile.departamento} />
                <ReadOnly label="Contacto emergencia" value={profile.contacto_emergencia_nombre} />
                <ReadOnly label="Telefono emergencia" value={profile.contacto_emergencia_telefono} />
                <ReadOnly label="Parentesco" value={profile.contacto_emergencia_parentesco} />
              </AppCard>
            )}

            {!editing ? <AppButton label="Editar perfil" onPress={() => setEditing(true)} /> : null}
            <AppButton label="Cerrar sesion" onPress={signOut} variant="danger" />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.readOnly}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <Text style={styles.readOnlyValue}>{value || 'No indicado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  form: { gap: 14 },
  readOnly: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
  readOnlyLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  readOnlyValue: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
