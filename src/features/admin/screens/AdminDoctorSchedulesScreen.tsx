import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { createAdminDoctorSchedule, deactivateAdminDoctorSchedule, getAdminDoctorSchedules, updateAdminDoctorSchedule } from '@/features/admin/services/adminService';
import type { AdminDoctorSchedule } from '@/features/admin/types/admin.types';

const days = [
  ['lunes', 'Lun'], ['martes', 'Mar'], ['miercoles', 'Mié'], ['jueves', 'Jue'], ['viernes', 'Vie'], ['sabado', 'Sáb'], ['domingo', 'Dom'],
] as const;
type Day = AdminDoctorSchedule['dia_semana'];
type RouteParams = { doctorId: number | string; doctorName?: string };

export function AdminDoctorSchedulesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { doctorId, doctorName } = route.params as RouteParams;
  const [items, setItems] = useState<AdminDoctorSchedule[]>([]);
  const [editing, setEditing] = useState<AdminDoctorSchedule | null | undefined>(undefined);
  const [day, setDay] = useState<Day>('lunes');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setItems(await getAdminDoctorSchedules(doctorId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los horarios.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [doctorId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openForm = (schedule?: AdminDoctorSchedule) => {
    setEditing(schedule ?? null);
    setDay(schedule?.dia_semana ?? 'lunes');
    setStart((schedule?.hora_inicio ?? '08:00').slice(0, 5));
    setEnd((schedule?.hora_fin ?? '17:00').slice(0, 5));
  };

  const save = async () => {
    if (saving) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) {
      Alert.alert('Horario inválido', 'Usa formato HH:MM y una hora final posterior a la inicial.');
      return;
    }
    setSaving(true);
    try {
      const payload = { dia_semana: day, hora_inicio: start, hora_fin: end, activo: true };
      if (editing) await updateAdminDoctorSchedule(doctorId, editing.id, payload);
      else await createAdminDoctorSchedule(doctorId, payload);
      setEditing(undefined);
      await load(true);
    } catch (err) {
      Alert.alert('Horarios', err instanceof Error ? err.message : 'No se pudo guardar el horario.');
    } finally { setSaving(false); }
  };

  const remove = (schedule: AdminDoctorSchedule) => Alert.alert('Desactivar horario', 'Las citas existentes no se cancelarán. Revisa manualmente si alguna queda afectada.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Desactivar', style: 'destructive', onPress: () => void deactivateAdminDoctorSchedule(doctorId, schedule.id).then(() => load(true)).catch((err) => Alert.alert('Horarios', err instanceof Error ? err.message : 'No se pudo desactivar.')) },
  ]);

  if (loading) return <LoadingState label="Cargando horarios..." />;
  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="calendar-clock-outline" subtitle={doctorName || 'Disponibilidad semanal del médico.'} title="Horarios médicos" />
          <AppButton label="Volver al usuario" onPress={() => navigation.goBack()} variant="secondary" />
          <AppButton label="Agregar horario" onPress={() => openForm()} />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Horarios no disponibles" /> : null}
          {!error && items.length === 0 ? <EmptyState description="Configura la disponibilidad semanal para habilitar la agenda." icon="calendar-plus" title="No hay horarios configurados" tone="info" /> : null}
          {items.map((item) => (
            <AppCard key={item.id} style={[styles.card, !item.activo && styles.inactive]}>
              <Text style={styles.title}>{dayName(item.dia_semana)}</Text>
              <Text style={styles.time}>{item.hora_inicio.slice(0, 5)} - {item.hora_fin.slice(0, 5)}</Text>
              <Text style={styles.meta}>{item.activo ? 'Disponible' : 'Inactivo'}</Text>
              {item.activo ? <><AppButton label="Editar" onPress={() => openForm(item)} variant="secondary" /><AppButton label="Desactivar" onPress={() => remove(item)} variant="danger" /></> : null}
            </AppCard>
          ))}
        </ScrollView>
        <Modal animationType="slide" transparent visible={editing !== undefined}>
          <View style={styles.backdrop}><AppCard style={styles.modal}>
            <Text style={styles.title}>{editing ? 'Editar horario' : 'Nuevo horario'}</Text>
            <View style={styles.days}>{days.map(([value, label]) => <Pressable key={value} onPress={() => setDay(value)} style={[styles.day, day === value && styles.dayActive]}><Text style={[styles.dayText, day === value && styles.dayTextActive]}>{label}</Text></Pressable>)}</View>
            <AppInput autoCapitalize="none" label="Hora inicial (HH:MM)" onChangeText={setStart} placeholder="08:00" value={start} />
            <AppInput autoCapitalize="none" label="Hora final (HH:MM)" onChangeText={setEnd} placeholder="17:00" value={end} />
            <Text style={styles.meta}>Los traslapes son validados por el servidor. Las citas existentes no se modifican automáticamente.</Text>
            <AppButton loading={saving} label="Guardar horario" onPress={save} />
            <AppButton disabled={saving} label="Cancelar" onPress={() => setEditing(undefined)} variant="secondary" />
          </AppCard></View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}

function dayName(day: Day) { return days.find(([value]) => value === day)?.[1] ?? day; }
const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(15, 23, 42, 0.35)', flex: 1, justifyContent: 'flex-end', padding: 18 },
  card: { gap: 9 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  day: { borderColor: colors.border, borderRadius: 8, borderWidth: 1, minWidth: 42, padding: 9 },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.muted, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  dayTextActive: { color: colors.white },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  inactive: { opacity: 0.6 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  modal: { gap: 12 },
  safe: { backgroundColor: colors.background, flex: 1 },
  time: { color: colors.primaryDark, fontSize: 18, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});
