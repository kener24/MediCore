import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppDateInput } from '@/components/AppDateInput';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { cancelSuperAdminSubscription, changeSuperAdminSubscription, extendSuperAdminTrial, getSuperAdminPlans, getSuperAdminSubscription, renewSuperAdminSubscription, setSuperAdminSubscriptionActive } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminPlan, SuperAdminSubscription } from '@/features/superadmin/types/superAdmin.types';

export function SuperAdminSubscriptionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const clinicId = (route.params as { clinicId?: number | string } | undefined)?.clinicId;
  const [subscription, setSubscription] = useState<SuperAdminSubscription | null>(null);
  const [plans, setPlans] = useState<SuperAdminPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [renewDate, setRenewDate] = useState('');
  const [trialDays, setTrialDays] = useState('7');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [nextSubscription, nextPlans] = await Promise.all([getSuperAdminSubscription(clinicId), getSuperAdminPlans()]);
      setSubscription(nextSubscription);
      setSelectedPlan(nextSubscription.plan);
      setPlans(nextPlans.filter((plan) => plan.active));
    } catch (error) { Alert.alert('Suscripción', error instanceof Error ? error.message : 'No se pudo cargar.'); }
    finally { setLoading(false); }
  }, [clinicId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function validate() {
    if (reason.trim().length >= 5) return true;
    Alert.alert('Motivo obligatorio', 'Indica un motivo claro para registrar la acción.');
    return false;
  }

  async function changePlan() {
    if (!clinicId || !subscription || !selectedPlan || !validate()) return;
    setSaving(true);
    try { await changeSuperAdminSubscription(clinicId, selectedPlan, subscription.billing_cycle, reason.trim()); setReason(''); await load(); Alert.alert('Suscripción', 'Plan actualizado correctamente.'); }
    catch (error) { Alert.alert('No se pudo actualizar', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { setSaving(false); }
  }

  async function changeStatus(active: boolean) {
    if (!clinicId || !validate()) return;
    setSaving(true);
    try { await setSuperAdminSubscriptionActive(clinicId, active, reason.trim()); setReason(''); await load(); }
    catch (error) { Alert.alert('No se pudo actualizar', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { setSaving(false); }
  }

  async function extendTrial() {
    const days = Number(trialDays);
    if (!clinicId || !validate()) return;
    if (!Number.isInteger(days) || days < 1 || days > 365) return Alert.alert('Días no válidos', 'Indica entre 1 y 365 días.');
    setSaving(true);
    try { await extendSuperAdminTrial(clinicId, days, reason.trim()); setReason(''); await load(); Alert.alert('Suscripción', 'Prueba extendida correctamente.'); }
    catch (error) { Alert.alert('No se pudo extender', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { setSaving(false); }
  }

  async function renew() {
    if (!clinicId || !renewDate || !validate()) return;
    setSaving(true);
    try { await renewSuperAdminSubscription(clinicId, renewDate, reason.trim()); setReason(''); setRenewDate(''); await load(); Alert.alert('Suscripción', 'Suscripción renovada correctamente.'); }
    catch (error) { Alert.alert('No se pudo renovar', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { setSaving(false); }
  }

  function confirmCancellation() {
    if (!clinicId || !validate()) return;
    Alert.alert('Cancelar suscripción', 'La clínica conservará sus datos, pero la suscripción dejará de estar activa.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar suscripción', style: 'destructive', onPress: () => void cancelSubscription() },
    ]);
  }

  async function cancelSubscription() {
    if (!clinicId) return;
    setSaving(true);
    try { await cancelSuperAdminSubscription(clinicId, reason.trim()); setReason(''); await load(); Alert.alert('Suscripción', 'Suscripción cancelada sin eliminar información.'); }
    catch (error) { Alert.alert('No se pudo cancelar', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { setSaving(false); }
  }

  if (loading || !subscription) return <LoadingState label="Cargando suscripción..." />;
  return <RoleGuard roles={['superadmin']}><KeyboardAwareScreen contentContainerStyle={styles.content}>
    <AppHeader icon="shield-check-outline" subtitle={`${subscription.plan_nombre ?? 'Plan'} · ${subscription.status}`} title={subscription.clinic_nombre ?? 'Suscripción'} />
    <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
    <AppCard style={styles.card}><Text style={styles.title}>Estado actual</Text><Text style={styles.meta}>Ciclo: {subscription.billing_cycle}</Text><Text style={styles.meta}>Vence: {subscription.end_date || 'Sin fecha definida'}</Text><Text style={styles.meta}>Estado: {subscription.status}</Text></AppCard>
    <AppCard style={styles.card}><Text style={styles.title}>Plan asignado</Text>{plans.map((plan) => <AppButton key={plan.id} label={`${selectedPlan === plan.id ? 'Seleccionado: ' : ''}${plan.name}`} onPress={() => setSelectedPlan(plan.id)} variant={selectedPlan === plan.id ? 'primary' : 'secondary'} />)}<AppInput label="Motivo obligatorio" multiline onChangeText={setReason} placeholder="Motivo contractual o administrativo" value={reason} /><AppButton label="Cambiar plan" loading={saving} onPress={changePlan} /><View style={styles.actions}><AppButton label="Suspender" onPress={() => void changeStatus(false)} style={styles.action} variant="danger" /><AppButton label="Reactivar" onPress={() => void changeStatus(true)} style={styles.action} /></View></AppCard>
    <AppCard style={styles.card}><Text style={styles.title}>Renovación y prueba</Text><AppDateInput label="Nueva fecha de vencimiento" minimumDate={new Date(Date.now() + 86_400_000)} onChange={setRenewDate} value={renewDate} /><AppButton label="Renovar suscripción" loading={saving} onPress={renew} /><AppInput keyboardType="number-pad" label="Días adicionales de prueba" onChangeText={setTrialDays} value={trialDays} /><AppButton label="Extender prueba" loading={saving} onPress={extendTrial} variant="secondary" /></AppCard>
    <AppCard style={styles.card}><Text style={styles.title}>Acción irreversible de estado</Text><Text style={styles.meta}>Cancelar no elimina clínicas, usuarios ni información histórica.</Text><AppButton label="Cancelar suscripción" loading={saving} onPress={confirmCancellation} variant="danger" /></AppCard>
  </KeyboardAwareScreen></RoleGuard>;
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  card: { gap: 12 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
});
