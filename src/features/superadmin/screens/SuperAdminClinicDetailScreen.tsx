import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { formatDateTime } from '@/features/cashier/types/commonCashier.types';
import { KeyValue, StatusPill } from '@/features/superadmin/components/SuperAdminCards';
import {
  clinicName,
  getSuperAdminClinic,
  getSuperAdminClinicAdmins,
  setClinicActive,
  setUserActive,
  userName,
} from '@/features/superadmin/services/superAdminService';
import type { SuperAdminClinic, SuperAdminUser } from '@/features/superadmin/types/superAdmin.types';

type RouteParams = { clinicId?: number | string };
type StatusModal = { active: boolean; clinic: SuperAdminClinic } | null;

export function SuperAdminClinicDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { clinicId } = (route.params ?? {}) as RouteParams;
  const [clinic, setClinic] = useState<SuperAdminClinic | null>(null);
  const [admins, setAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusModal, setStatusModal] = useState<StatusModal>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!clinicId) {
      setError('No se recibió la clínica a consultar.');
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextClinic, nextAdmins] = await Promise.all([
        getSuperAdminClinic(clinicId),
        getSuperAdminClinicAdmins({ clinic: clinicId }).catch(() => []),
      ]);
      setClinic(nextClinic);
      setAdmins(nextAdmins.filter((user) => user.clinica === Number(clinicId) || user.clinica_nombre === nextClinic.nombre));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la clínica.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const activeAdmins = useMemo(() => admins.filter((admin) => admin.is_active !== false).length, [admins]);

  const openStatus = (active: boolean) => {
    if (!clinic) return;
    setReason('');
    setStatusModal({ active, clinic });
  };

  async function submitStatus() {
    if (!statusModal || saving) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 8) return Alert.alert('Motivo requerido', 'Escribe un motivo claro de al menos 8 caracteres.');
    setSaving(true);
    try {
      await setClinicActive(statusModal.clinic.id, statusModal.active, cleanReason);
      setStatusModal(null);
      await load(true);
    } catch (err) {
      Alert.alert('Clínicas', err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    } finally {
      setSaving(false);
    }
  }

  const confirmAdminStatus = (admin: SuperAdminUser, active: boolean) => {
    if (!active && admin.is_active !== false && activeAdmins <= 1) {
      Alert.alert('Acción bloqueada', 'No puedes dejar la clínica sin administrador activo.');
      return;
    }
    Alert.alert(active ? 'Activar admin' : 'Desactivar admin', `${userName(admin)} cambiará de estado.`, [
      { style: 'cancel', text: 'Cancelar' },
      {
        onPress: () => void setUserActive(admin.id, active, active ? 'Reactivación autorizada por superadmin.' : 'Desactivación autorizada por superadmin.')
          .then(() => load(true))
          .catch((err) => Alert.alert('Administradores', err instanceof Error ? err.message : 'No se pudo cambiar el estado.')),
        style: active ? 'default' : 'destructive',
        text: 'Confirmar',
      },
    ]);
  };

  if (loading) return <LoadingState label="Cargando clínica..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="hospital-building" subtitle="Clínica y administradores asignados." title="Detalle de clínica" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Clínica no disponible" /> : null}
          <AppButton label="Volver a clínicas" onPress={() => navigation.goBack()} variant="secondary" />

          {clinic ? (
            <>
              <AppCard style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.main}>
                    <Text style={styles.title}>{clinicName(clinic)}</Text>
                    <Text style={styles.meta}>{clinic.correo || 'Sin correo'} · {clinic.telefono || 'Sin teléfono'}</Text>
                  </View>
                  <StatusPill active={clinic.activo !== false} />
                </View>
                <KeyValue label="RTN" value={clinic.rtn} />
                <KeyValue label="Dirección" value={clinic.direccion} />
                <KeyValue label="Creada" value={formatDateTime(clinic.creado_en)} />
                <KeyValue label="Actualizada" value={formatDateTime(clinic.actualizado_en)} />
                <AppButton label="Editar clínica" onPress={() => navigation.navigate('SuperAdminEditClinic', { clinicId: clinic.id })} />
                <AppButton label="Crear admin para esta clínica" onPress={() => navigation.navigate('SuperAdminCreateAdmin', { clinicId: clinic.id })} variant="secondary" />
                <AppButton
                  label={clinic.activo === false ? 'Activar clínica' : 'Desactivar clínica'}
                  onPress={() => openStatus(clinic.activo === false)}
                  variant={clinic.activo === false ? 'secondary' : 'danger'}
                />
              </AppCard>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Administradores de clínica</Text>
                {admins.length === 0 ? <EmptyState description="Esta clínica aún no tiene administradores asignados." title="Sin administradores" /> : null}
                {admins.map((admin) => (
                  <AppCard key={admin.id} style={styles.card}>
                    <View style={styles.row}>
                      <View style={styles.main}>
                        <Text style={styles.title}>{userName(admin)}</Text>
                        <Text style={styles.meta}>{admin.email}</Text>
                        <Text style={styles.meta}>Último acceso: {formatDateTime(admin.ultimo_acceso)}</Text>
                      </View>
                      <StatusPill active={admin.is_active !== false} />
                    </View>
                    <AppButton label="Editar admin" onPress={() => navigation.navigate('SuperAdminEditAdmin', { userId: admin.id })} variant="secondary" />
                    <AppButton
                      label={admin.is_active === false ? 'Activar admin' : 'Desactivar admin'}
                      onPress={() => confirmAdminStatus(admin, admin.is_active === false)}
                      variant={admin.is_active === false ? 'secondary' : 'danger'}
                    />
                  </AppCard>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>

        <Modal animationType="fade" transparent visible={Boolean(statusModal)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{statusModal?.active ? 'Activar clínica' : 'Desactivar clínica'}</Text>
              <Text style={styles.modalText}>El motivo quedará en auditoría y ayuda a explicar la acción administrativa.</Text>
              <AppInput label="Motivo" multiline onChangeText={setReason} placeholder="Ej. Suspensión solicitada por administración" value={reason} />
              <View style={styles.modalActions}>
                <AppButton disabled={saving} label="Cancelar" onPress={() => setStatusModal(null)} variant="secondary" />
                <AppButton label="Confirmar" loading={saving} onPress={submitStatus} variant={statusModal?.active ? 'primary' : 'danger'} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  content: { gap: 14, padding: 18, paddingBottom: 130 },
  main: { flex: 1, gap: 3 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  modalActions: { gap: 10 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 22, gap: 14, padding: 18, width: '92%' },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.36)', flex: 1, justifyContent: 'center', padding: 18 },
  modalText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  safe: { backgroundColor: colors.background, flex: 1 },
  section: { gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
