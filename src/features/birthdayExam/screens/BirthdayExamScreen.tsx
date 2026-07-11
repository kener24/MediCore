import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import {
  createBirthdayExamRecord,
  deleteBirthdayExamRecord,
  getBirthdayExamRecord,
  getBirthdayExamRecords,
  updateBirthdayExamRecord,
  type BirthdayExamRecord,
} from '@/features/birthdayExam/services/birthdayExamService';

const emptyForm = { fecha_cumpleanos: '', nombre: '', telefono: '' };

export function BirthdayExamScreen() {
  const navigation = useNavigation<any>();
  const [records, setRecords] = useState<BirthdayExamRecord[]>([]);
  const [selected, setSelected] = useState<BirthdayExamRecord | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setRecords(await getBirthdayExamRecords());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    const payload = {
      fecha_cumpleanos: form.fecha_cumpleanos.trim(),
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
    };
    if (!payload.nombre || !payload.fecha_cumpleanos) {
      Alert.alert('Cumpleaños', 'Nombre y fecha de cumpleaños son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const saved = editingId
        ? await updateBirthdayExamRecord(editingId, payload)
        : await createBirthdayExamRecord(payload);
      setSelected(saved);
      resetForm();
      await load(true);
      Alert.alert('Cumpleaños', editingId ? 'Registro editado correctamente.' : 'Registro guardado correctamente.');
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  async function showDetails(record: BirthdayExamRecord) {
    try {
      setSelected(await getBirthdayExamRecord(record.id));
    } catch (err) {
      Alert.alert('No se pudo cargar', err instanceof Error ? err.message : 'Intenta nuevamente.');
    }
  }

  function edit(record: BirthdayExamRecord) {
    setEditingId(record.id);
    setForm({
      fecha_cumpleanos: record.fecha_cumpleanos,
      nombre: record.nombre,
      telefono: record.telefono,
    });
  }

  function remove(record: BirthdayExamRecord) {
    Alert.alert('Eliminar registro', `¿Deseas eliminar el registro de ${record.nombre}?`, [
      { style: 'cancel', text: 'Cancelar' },
      {
        style: 'destructive',
        text: 'Eliminar',
        onPress: () => void deleteBirthdayExamRecord(record.id)
          .then(async () => {
            if (selected?.id === record.id) setSelected(null);
            if (editingId === record.id) resetForm();
            await load(true);
          })
          .catch((err) => Alert.alert('No se pudo eliminar', err instanceof Error ? err.message : 'Intenta nuevamente.')),
      },
    ]);
  }

  if (loading) return <LoadingState label="Cargando cumpleaños..." />;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
        <AppHeader icon="cake-variant-outline" subtitle="Vista temporal para examen." title="Cumpleaños" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}

        <AppCard style={styles.formCard}>
          <AppInput autoCapitalize="words" icon="account-outline" label="Nombre" onChangeText={(value) => setForm((current) => ({ ...current, nombre: value }))} placeholder="Nombre" value={form.nombre} />
          <AppInput icon="calendar-outline" keyboardType="numbers-and-punctuation" label="Fecha de cumpleaños" onChangeText={(value) => setForm((current) => ({ ...current, fecha_cumpleanos: value }))} placeholder="YYYY-MM-DD" value={form.fecha_cumpleanos} />
          <AppInput icon="phone-outline" keyboardType="phone-pad" label="Telefono" onChangeText={(value) => setForm((current) => ({ ...current, telefono: value }))} placeholder="Telefono" value={form.telefono} />
          <View style={styles.buttonRow}>
            <AppButton label={editingId ? 'Editar' : 'Guardar'} loading={saving} onPress={save} />
            {editingId ? <AppButton label="Cancelar" onPress={resetForm} variant="secondary" /> : null}
          </View>
          <AppButton label="Regresar al menú principal" onPress={() => navigation.goBack()} variant="secondary" />
        </AppCard>

        <Text style={styles.sectionTitle}>Registros guardados</Text>
        {records.length === 0 ? <EmptyState description="Guarda el primer cumpleaños para el examen." title="No hay registros" /> : null}
        {records.map((record) => (
          <AppCard key={record.id} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <View style={styles.recordText}>
                <Text style={styles.recordName}>{record.nombre}</Text>
                <Text style={styles.meta}>Fecha de cumpleaños: {record.fecha_cumpleanos}</Text>
                <Text style={styles.meta}>Telefono: {record.telefono || 'Sin telefono'}</Text>
              </View>
              <MaterialCommunityIcons color={colors.primary} name="cake-variant-outline" size={24} />
            </View>
            <View style={styles.actions}>
              <SmallAction icon="eye-outline" label="Ver" onPress={() => showDetails(record)} />
              <SmallAction icon="pencil-outline" label="Editar" onPress={() => edit(record)} />
              <SmallAction danger icon="trash-can-outline" label="Eliminar" onPress={() => remove(record)} />
            </View>
          </AppCard>
        ))}

        <AppCard style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Detalles de un registro</Text>
          {selected ? (
            <>
              <Detail label="Nombre" value={selected.nombre} />
              <Detail label="Fecha de cumpleaños" value={selected.fecha_cumpleanos} />
              <Detail label="Telefono" value={selected.telefono || 'Sin telefono'} />
            </>
          ) : (
            <Text style={styles.meta}>Presiona Ver en un registro para mostrar sus detalles.</Text>
          )}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SmallAction({ danger, icon, label, onPress }: { danger?: boolean; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallAction, danger && styles.smallDanger, pressed && styles.pressed]}>
      <MaterialCommunityIcons color={danger ? colors.danger : colors.primary} name={icon} size={18} />
      <Text style={[styles.smallText, danger && styles.smallDangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buttonRow: { gap: 10 },
  content: { gap: 14, padding: 18, paddingBottom: 120 },
  detailCard: { gap: 10 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  detailRow: { borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 4, padding: 12 },
  detailValue: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  formCard: { gap: 12 },
  meta: { color: colors.muted, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  recordCard: { gap: 12 },
  recordHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  recordName: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  recordText: { flex: 1, gap: 3 },
  safe: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  smallAction: { alignItems: 'center', backgroundColor: colors.palePrimary, borderRadius: 12, flexDirection: 'row', gap: 5, paddingHorizontal: 12, paddingVertical: 9 },
  smallDanger: { backgroundColor: '#fff1f2' },
  smallDangerText: { color: colors.danger },
  smallText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
});
