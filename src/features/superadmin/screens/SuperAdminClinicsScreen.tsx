import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { StatusPill } from '@/features/superadmin/components/SuperAdminCards';
import { clinicName, getSuperAdminClinics, setClinicActive } from '@/features/superadmin/services/superAdminService';
import type { SuperAdminClinic } from '@/features/superadmin/types/superAdmin.types';

type StatusModal = { active: boolean; clinic: SuperAdminClinic } | null;

export function SuperAdminClinicsScreen() {
  const navigation = useNavigation<any>();
  const [clinics, setClinics] = useState<SuperAdminClinic[]>([]);
  const [search, setSearch] = useState('');
  const [statusModal, setStatusModal] = useState<StatusModal>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setClinics(await getSuperAdminClinics());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las clínicas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clinics;
    return clinics.filter((clinic) => [clinic.nombre, clinic.correo, clinic.rtn].join(' ').toLowerCase().includes(term));
  }, [clinics, search]);

  const openStatusModal = (clinic: SuperAdminClinic, active: boolean) => {
    setReason('');
    setStatusModal({ active, clinic });
  };

  async function submitStatusChange() {
    if (!statusModal) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      Alert.alert('Motivo requerido', 'Escribe un motivo claro para auditoría.');
      return;
    }
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

  if (loading) return <LoadingState label="Cargando clínicas..." />;

  return (
    <RoleGuard roles={['superadmin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="hospital-building" subtitle="Gestión global de clínicas del SaaS." title="Clínicas" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Clínicas no disponibles" /> : null}
          <AppButton label="Crear clínica" onPress={() => navigation.navigate('SuperAdminCreateClinic')} />
          <AppInput icon="magnify" label="Buscar clínica" onChangeText={setSearch} placeholder="Nombre, correo o RTN" value={search} />
          <Text style={styles.counter}>{filtered.length} de {clinics.length} clínicas</Text>
          {!error && filtered.length === 0 ? <EmptyState description="No hay clínicas con esos criterios." title="Sin resultados" /> : null}
          {filtered.map((clinic) => (
            <AppCard key={clinic.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.main}>
                  <Text style={styles.title}>{clinicName(clinic)}</Text>
                  <Text style={styles.meta}>{clinic.correo || 'Sin correo'} · {clinic.telefono || 'Sin teléfono'}</Text>
                  <Text style={styles.meta}>RTN: {clinic.rtn || 'Sin RTN'}</Text>
                </View>
                <StatusPill active={clinic.activo !== false} />
              </View>
              <AppButton
                label={clinic.activo === false ? 'Activar' : 'Desactivar'}
                onPress={() => openStatusModal(clinic, clinic.activo === false)}
                variant={clinic.activo === false ? 'secondary' : 'danger'}
              />
            </AppCard>
          ))}
        </ScrollView>

        <Modal animationType="fade" transparent visible={Boolean(statusModal)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{statusModal?.active ? 'Activar clínica' : 'Desactivar clínica'}</Text>
              <Text style={styles.modalText}>
                {statusModal?.clinic ? clinicName(statusModal.clinic) : 'Esta clínica'} cambiará de estado. El motivo quedará en auditoría.
              </Text>
              <AppInput label="Motivo" multiline onChangeText={setReason} placeholder="Ej. Suspensión solicitada por administración" value={reason} />
              <View style={styles.modalActions}>
                <AppButton disabled={saving} label="Cancelar" onPress={() => setStatusModal(null)} variant="secondary" />
                <AppButton label="Confirmar" loading={saving} onPress={submitStatusChange} variant={statusModal?.active ? 'primary' : 'danger'} />
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
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  counter: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  main: { flex: 1, gap: 3 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  modalActions: { gap: 10 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 22, gap: 14, padding: 18, width: '92%' },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.36)', flex: 1, justifyContent: 'center', padding: 18 },
  modalText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  safe: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
