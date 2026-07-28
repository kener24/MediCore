import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { colors } from '@/core/theme/colors';
import { isNonNegativeMoney, isPositiveMoney } from '@/core/utils/formValidation';
import { CashierHeader } from '@/features/cashier/components/CashierHeader';
import { closeCashSession, createCashMovement, getCashSessions, getCashSummary, getCurrentCashSession, openCashSession } from '@/features/cashier/services/cashierCashService';
import type { CashSession, CashSummary } from '@/features/cashier/types/cashierCash.types';
import { formatCurrency, formatDateTime, numericValue } from '@/features/cashier/types/commonCashier.types';

type Mode = 'open' | 'close' | 'ingreso' | 'egreso';

export function CashierCashSessionScreen() {
  const navigation = useNavigation<any>();
  const [current, setCurrent] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [mode, setMode] = useState<Mode>('open');
  const [amount, setAmount] = useState('0.00');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [session, history, daySummary] = await Promise.all([getCurrentCashSession(), getCashSessions().catch(() => []), getCashSummary().catch(() => null)]);
      setCurrent(session);
      setSummary(daySummary);
      setSessions(history.slice(0, 8));
      if (session) {
        setMode('close');
        setAmount(String(session.expected_amount_live ?? session.expected_amount ?? '0.00'));
      } else {
        setMode('open');
        setAmount('0.00');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar caja.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function submit() {
    if (saving) return;
    const value = Number(amount);
    const expected = numericValue(current?.expected_amount_live ?? current?.expected_amount);
    const difference = mode === 'close' ? value - expected : 0;

    if (!isNonNegativeMoney(amount)) return Alert.alert('Caja', 'Ingresa un monto válido.');
    if ((mode === 'ingreso' || mode === 'egreso') && (!current?.id || !isPositiveMoney(amount) || !reason.trim())) {
      return Alert.alert('Caja', 'Para registrar movimientos debes indicar monto mayor a 0 y razón.');
    }
    if (mode === 'close' && difference !== 0 && !notes.trim()) {
      return Alert.alert('Caja', 'Debes agregar una nota cuando el arqueo tenga diferencia.');
    }

    setSaving(true);
    const idempotencyKey = requestKey || `mobile-cash-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setRequestKey(idempotencyKey);
    try {
      if (mode === 'open') {
        await openCashSession({ opening_amount: value, notes: notes.trim() });
        Alert.alert('Caja', 'Caja abierta correctamente.');
      } else if (mode === 'close' && current?.id) {
        await closeCashSession(current.id, { closing_amount: value, notes: notes.trim() });
        Alert.alert('Caja', 'Caja cerrada correctamente.');
      } else if ((mode === 'ingreso' || mode === 'egreso') && current?.id) {
        await createCashMovement(current.id, { amount: value, movement_type: mode, notes: notes.trim(), reason: reason.trim() }, idempotencyKey);
        Alert.alert('Caja', 'Movimiento registrado correctamente.');
      }
      setReason('');
      setNotes('');
      setRequestKey('');
      await load(true);
    } catch (err) {
      Alert.alert('Caja', err instanceof Error ? err.message : 'No se pudo guardar la operación.');
    } finally {
      setSaving(false);
    }
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setReason('');
    setNotes('');
    setRequestKey(`mobile-cash-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    if (nextMode === 'close') setAmount(String(current?.expected_amount_live ?? current?.expected_amount ?? '0.00'));
    if (nextMode === 'open') setAmount('0.00');
    if (nextMode === 'ingreso' || nextMode === 'egreso') setAmount('0.00');
  }

  if (loading) return <LoadingState label="Cargando caja..." />;

  const expected = numericValue(current?.expected_amount_live ?? current?.expected_amount);
  const closing = Number(amount || 0);
  const difference = mode === 'close' ? closing - expected : 0;

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <CashierHeader subtitle="Apertura, cobros en efectivo, movimientos y cierre." title="Caja y arqueo" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar" /> : null}
          <AppCard style={styles.statusCard}>
            <Text style={styles.statusLabel}>Estado actual</Text>
            <Text style={styles.statusTitle}>{current ? 'Caja abierta' : 'Sin caja abierta'}</Text>
            {current ? <Text style={styles.meta}>Apertura: {formatDateTime(current.opening_datetime)}</Text> : <Text style={styles.meta}>Abre caja para poder registrar pagos en efectivo.</Text>}
          </AppCard>
          {summary ? (
            <View style={styles.statsGrid}>
              <MiniStat label="Abiertas" value={String(summary.open_sessions ?? 0)} />
              <MiniStat label="Efectivo hoy" value={formatCurrency(summary.cash_payments)} />
              <MiniStat label="Tarj./transf." value={formatCurrency(numericValue(summary.card_payments) + numericValue(summary.transfer_payments))} />
              <MiniStat label="Dif. cierres" value={formatCurrency(summary.difference_total)} />
            </View>
          ) : null}
          {current ? (
            <View style={styles.statsGrid}>
              <MiniStat label="Apertura" value={formatCurrency(current.opening_amount)} />
              <MiniStat label="Efectivo" value={formatCurrency(current.cash_total)} />
              <MiniStat label="Ingresos" value={formatCurrency(current.income_total)} />
              <MiniStat label="Egresos" value={formatCurrency(current.expense_total)} />
              <MiniStat emphasis label="Esperado" value={formatCurrency(expected)} />
            </View>
          ) : null}
          <AppCard style={styles.form}>
            <View style={styles.modeRow}>
              {!current ? <ModeButton active={mode === 'open'} label="Abrir" onPress={() => selectMode('open')} /> : null}
              {current ? <ModeButton active={mode === 'close'} label="Cerrar" onPress={() => selectMode('close')} /> : null}
              {current ? <ModeButton active={mode === 'ingreso'} label="Ingreso" onPress={() => selectMode('ingreso')} /> : null}
              {current ? <ModeButton active={mode === 'egreso'} label="Egreso" onPress={() => selectMode('egreso')} /> : null}
            </View>
            {mode === 'close' ? <Text style={[styles.hint, difference !== 0 && styles.warning]}>Monto esperado: {formatCurrency(expected)}. Diferencia actual: {formatCurrency(difference)}{difference !== 0 ? '. Nota obligatoria.' : ''}</Text> : null}
            <AppInput keyboardType="decimal-pad" label={mode === 'open' ? 'Monto de apertura' : mode === 'close' ? 'Monto contado' : 'Monto'} onChangeText={setAmount} sanitizer="money" value={amount} />
            {mode === 'ingreso' || mode === 'egreso' ? <AppInput label="Razón" onChangeText={setReason} value={reason} /> : null}
            <AppInput label="Notas" multiline onChangeText={setNotes} scrollEnabled={false} style={styles.textArea} value={notes} />
            <AppButton disabled={saving} label={mode === 'open' ? 'Abrir caja' : mode === 'close' ? 'Cerrar caja' : 'Registrar movimiento'} loading={saving} onPress={submit} variant={mode === 'close' ? 'danger' : 'primary'} />
          </AppCard>
          <AppCard style={styles.form}>
            <Text style={styles.sectionTitle}>Movimientos recientes</Text>
            {current?.movements?.length ? current.movements.slice(0, 6).map((movement) => (
              <View key={movement.id ?? `${movement.reason}-${movement.amount}`} style={styles.movement}>
                <View style={styles.movementCopy}>
                  <Text style={styles.movementTitle}>{movement.reason ?? 'Movimiento'}</Text>
                  <Text style={styles.meta}>{formatDateTime(movement.creado_en ?? movement.created_at)}</Text>
                </View>
                <Text style={[styles.movementAmount, movement.movement_type === 'egreso' && styles.negative]}>{movement.movement_type === 'egreso' ? '-' : '+'}{formatCurrency(movement.amount)}</Text>
              </View>
            )) : <EmptyState description="Aún no hay movimientos manuales en esta caja." title="Sin movimientos" />}
          </AppCard>
          <AppCard style={styles.form}>
            <Text style={styles.sectionTitle}>Últimas sesiones</Text>
            {sessions.length ? sessions.map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <View style={styles.movementCopy}>
                  <Text style={styles.movementTitle}>Caja #{session.id} · {session.status ?? 'sin estado'}</Text>
                  <Text style={styles.meta}>{formatDateTime(session.opening_datetime)}</Text>
                </View>
                <Text style={styles.movementAmount}>{formatCurrency(session.expected_amount_live ?? session.expected_amount)}</Text>
              </View>
            )) : <EmptyState description="No hay sesiones registradas." title="Sin historial" />}
          </AppCard>
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
    </KeyboardAwareScreen>
  );
}

function MiniStat({ emphasis, label, value }: { emphasis?: boolean; label: string; value: string }) {
  return (
    <AppCard style={[styles.miniStat, emphasis && styles.emphasisStat]}>
      <Text style={[styles.statLabel, emphasis && styles.emphasisText]}>{label}</Text>
      <Text style={[styles.statValue, emphasis && styles.emphasisText]}>{value}</Text>
    </AppCard>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 140 },
  emphasisStat: { backgroundColor: colors.primary },
  emphasisText: { color: colors.white },
  form: { gap: 12 },
  hint: { color: colors.muted, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  miniStat: { flexBasis: '47%', flexGrow: 1, gap: 5, minHeight: 76 },
  modeButton: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  modeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  modeTextActive: { color: colors.white },
  movement: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingTop: 10 },
  movementAmount: { color: colors.primaryDark, fontSize: 14, fontWeight: '900' },
  movementCopy: { flex: 1, gap: 3 },
  movementTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  negative: { color: colors.danger },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  sessionRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  statValue: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  statusCard: { gap: 6 },
  statusLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  statusTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  warning: { color: colors.danger },
});
