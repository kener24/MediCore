import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { createSuperAdminPlan, getSuperAdminPlans, updateSuperAdminPlan } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminPlan } from '@/features/superadmin/types/superAdmin.types';

const emptyPlan: Partial<SuperAdminPlan> = {
  active: true,
  allow_audit: false,
  allow_billing: true,
  allow_inventory: false,
  allow_mobile_api: true,
  allow_notifications: true,
  allow_patient_portal: false,
  allow_purchases: false,
  allow_reports: true,
  code: '',
  description: '',
  max_appointments_per_month: 200,
  max_doctors: 2,
  max_patients: 300,
  max_storage_mb: 1000,
  max_users: 5,
  name: '',
  price_monthly: '0',
  price_yearly: '0',
};

const featureLabels: [keyof SuperAdminPlan, string][] = [
  ['allow_billing', 'Facturación'],
  ['allow_inventory', 'Inventario'],
  ['allow_purchases', 'Compras'],
  ['allow_reports', 'Reportes'],
  ['allow_audit', 'Auditoría'],
  ['allow_notifications', 'Notificaciones'],
  ['allow_patient_portal', 'Portal paciente'],
  ['allow_mobile_api', 'Acceso móvil'],
];

export function SuperAdminPlansScreen() {
  const navigation = useNavigation<any>();
  const [plans, setPlans] = useState<SuperAdminPlan[]>([]);
  const [form, setForm] = useState<Partial<SuperAdminPlan>>(emptyPlan);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlans(await getSuperAdminPlans()); }
    catch (error) { Alert.alert('Planes', error instanceof Error ? error.message : 'No se pudieron cargar los planes.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (patch: Partial<SuperAdminPlan>) => setForm((current) => ({ ...current, ...patch }));
  const numberValue = (key: keyof SuperAdminPlan, value: string) => update({ [key]: Number(value.replace(/\D/g, '')) } as Partial<SuperAdminPlan>);

  async function save() {
    if (saving) return;
    if (!form.name?.trim() || !form.code?.trim()) return Alert.alert('Plan', 'Nombre y código son obligatorios.');
    if ([form.max_users, form.max_doctors, form.max_patients, form.max_appointments_per_month, form.max_storage_mb].some((value) => Number(value) < 0)) return Alert.alert('Plan', 'Los límites no pueden ser negativos.');
    setSaving(true);
    try {
      if (form.id) await updateSuperAdminPlan(form.id, form);
      else await createSuperAdminPlan(form);
      setForm({ ...emptyPlan });
      await load();
      Alert.alert('Plan', 'Plan guardado correctamente.');
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Revisa la información.');
    } finally { setSaving(false); }
  }

  if (loading) return <LoadingState label="Cargando planes..." />;
  return (
    <RoleGuard roles={['superadmin']}>
      <KeyboardAwareScreen contentContainerStyle={styles.content}>
        <AppHeader icon="credit-card-settings-outline" subtitle="Funciones y límites comerciales del SaaS." title="Planes" />
        <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
        <AppCard style={styles.card}>
          <Text style={styles.title}>{form.id ? 'Editar plan' : 'Nuevo plan'}</Text>
          <AppInput label="Nombre" onChangeText={(value) => update({ name: value })} value={form.name ?? ''} />
          <AppInput autoCapitalize="none" label="Código" onChangeText={(value) => update({ code: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} value={form.code ?? ''} />
          <AppInput keyboardType="decimal-pad" label="Precio mensual" onChangeText={(value) => update({ price_monthly: value.replace(/[^0-9.]/g, '') })} value={String(form.price_monthly ?? '0')} />
          <AppInput keyboardType="decimal-pad" label="Precio anual" onChangeText={(value) => update({ price_yearly: value.replace(/[^0-9.]/g, '') })} value={String(form.price_yearly ?? '0')} />
          {([['max_users', 'Máximo de usuarios'], ['max_doctors', 'Máximo de médicos'], ['max_patients', 'Máximo de pacientes'], ['max_appointments_per_month', 'Citas por mes'], ['max_storage_mb', 'Almacenamiento MB']] as [keyof SuperAdminPlan, string][]).map(([key, label]) => <AppInput key={key} keyboardType="number-pad" label={label} onChangeText={(value) => numberValue(key, value)} value={String(form[key] ?? 0)} />)}
          <Text style={styles.subtitle}>Funciones incluidas</Text>
          {featureLabels.map(([key, label]) => <View key={key} style={styles.switchRow}><Text style={styles.meta}>{label}</Text><Switch onValueChange={(value) => update({ [key]: value } as Partial<SuperAdminPlan>)} value={Boolean(form[key])} /></View>)}
          <AppButton label={form.id ? 'Guardar cambios' : 'Crear plan'} loading={saving} onPress={save} />
          {form.id ? <AppButton label="Cancelar edición" onPress={() => setForm({ ...emptyPlan })} variant="secondary" /> : null}
        </AppCard>
        <Text style={styles.sectionTitle}>Planes registrados</Text>
        {plans.length === 0 ? <EmptyState description="Crea el primer plan para asignarlo a clínicas." title="No hay planes registrados" /> : null}
        {plans.map((plan) => <AppCard key={plan.id} style={styles.card}><Text style={styles.title}>{plan.name}</Text><Text style={styles.meta}>{plan.code} · L {plan.price_monthly}/mes</Text><Text style={styles.meta}>{plan.max_users} usuarios · {plan.max_doctors} médicos · {plan.max_patients} pacientes</Text><AppButton label="Editar plan" onPress={() => setForm({ ...plan })} variant="secondary" /></AppCard>)}
      </KeyboardAwareScreen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  meta: { color: colors.muted, flex: 1, fontSize: 13, fontWeight: '700' },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  subtitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
