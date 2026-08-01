import { useFocusEffect } from '@react-navigation/native';
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
import { isValidEmail, isValidPhone, phoneDigits } from '@/core/utils/formValidation';
import { AdminInfoRow, AdminStatusCard } from '@/features/admin/components/AdminCards';
import {
  clinicEmail,
  clinicName,
  clinicPhone,
  getAdminClinic,
  getAdminFiscalRanges,
  getAdminFiscalReadiness,
  getAdminOperationStatus,
  updateAdminClinic,
} from '@/features/admin/services/adminService';
import type { AdminClinic, AdminFiscalRange, AdminFiscalReadiness, AdminOperationStatus } from '@/features/admin/types/admin.types';
import { formatDate } from '@/features/patient/utils/formatters';

type RangeHealth = 'ok' | 'warning' | 'danger' | 'inactive';
type ClinicForm = { correo: string; direccion: string; nombre: string; rtn: string; telefono: string };

export function AdminClinicScreen() {
  const [clinic, setClinic] = useState<AdminClinic | null>(null);
  const [readiness, setReadiness] = useState<AdminFiscalReadiness | null>(null);
  const [ranges, setRanges] = useState<AdminFiscalRange[]>([]);
  const [operationStatus, setOperationStatus] = useState<AdminOperationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClinicForm>({ correo: '', direccion: '', nombre: '', rtn: '', telefono: '' });

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextClinic, nextReadiness, nextRanges, nextOperationStatus] = await Promise.all([
        getAdminClinic(),
        getAdminFiscalReadiness().catch(() => null),
        getAdminFiscalRanges().catch(() => []),
        getAdminOperationStatus().catch(() => null),
      ]);
      setClinic(nextClinic);
      setReadiness(nextReadiness);
      setRanges(nextRanges);
      setOperationStatus(nextOperationStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información de la clínica.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const fiscalReady = Boolean(readiness?.ready ?? readiness?.is_ready ?? (readiness?.profile_complete && readiness?.has_active_range));
  const sortedRanges = useMemo(
    () => [...ranges].sort((a, b) => Number(b.is_active) - Number(a.is_active) || String(a.expiration_date ?? '').localeCompare(String(b.expiration_date ?? ''))),
    [ranges],
  );
  const activeRanges = ranges.filter((range) => range.is_active && !range.is_exhausted).length;
  const exhaustedRanges = ranges.filter((range) => range.is_exhausted).length;
  const expiringRanges = ranges.filter((range) => isExpiringSoon(range.expiration_date)).length;
  const missingFields = getMissingClinicFields(clinic);
  const checklist = buildClinicChecklist({ activeRanges, fiscalReady, missingFields, readiness, ranges });

  const openEdit = () => {
    setForm({
      correo: clinic?.correo ?? clinic?.email ?? '',
      direccion: clinic?.direccion ?? clinic?.address ?? '',
      nombre: clinicName(clinic) === 'Clínica' ? '' : clinicName(clinic),
      rtn: clinic?.rtn ?? '',
      telefono: clinic?.telefono ?? clinic?.phone ?? '',
    });
    setEditOpen(true);
  };

  const saveClinic = async () => {
    const validation = validateClinicForm(form);
    if (validation) {
      Alert.alert('Clínica', validation);
      return;
    }
    setSaving(true);
    try {
      await updateAdminClinic({
        correo: form.correo.trim().toLowerCase(),
        direccion: form.direccion.trim(),
        nombre: form.nombre.trim(),
        rtn: form.rtn.replace(/\D/g, ''),
        telefono: phoneDigits(form.telefono),
      });
      setEditOpen(false);
      await load(true);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Revisa los datos de la clínica.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Cargando clínica..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="domain" subtitle="Datos generales, operación fiscal y riesgos de emisión." title="Clínica y fiscal" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Clínica no disponible" /> : null}

          <View style={styles.summaryGrid}>
            <AppCard style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{clinic?.activo === false || clinic?.active === false ? 'Inactiva' : 'Activa'}</Text>
              <Text style={styles.summaryLabel}>Estado de clínica</Text>
            </AppCard>
            <AppCard style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{activeRanges}</Text>
              <Text style={styles.summaryLabel}>Rangos activos</Text>
            </AppCard>
            <AppCard style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{expiringRanges}</Text>
              <Text style={styles.summaryLabel}>Por vencer</Text>
            </AppCard>
            <AppCard style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{exhaustedRanges}</Text>
              <Text style={styles.summaryLabel}>Agotados</Text>
            </AppCard>
          </View>

          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Datos generales</Text>
              <Text style={[styles.badge, missingFields.length ? styles.badgeWarning : styles.badgeOk]}>
                {missingFields.length ? `${missingFields.length} pendientes` : 'Completo'}
              </Text>
            </View>
            <AdminInfoRow label="Nombre" value={clinicName(clinic)} />
            <AdminInfoRow label="Correo" value={clinicEmail(clinic)} />
            <AdminInfoRow label="Teléfono" value={clinicPhone(clinic)} />
            <AdminInfoRow label="Dirección" value={clinic?.direccion ?? clinic?.address} />
            <AdminInfoRow label="RTN" value={clinic?.rtn} />
            {missingFields.length ? <Text style={styles.helper}>Pendiente: {missingFields.join(', ')}.</Text> : null}
            <AppButton label="Editar datos de clínica" onPress={openEdit} variant="secondary" />
          </AppCard>

          <AdminStatusCard
            description={fiscalReady ? 'Perfil fiscal y rango activo disponibles para emitir.' : readiness?.message ?? 'Revisa configuración fiscal desde el panel web antes de emitir.'}
            icon={fiscalReady ? 'file-certificate-outline' : 'alert-circle-outline'}
            title={fiscalReady ? 'Facturación fiscal habilitada' : 'Facturación fiscal pendiente'}
            tone={fiscalReady ? 'primary' : 'warning'}
          />

          <AppCard style={styles.card}>
            <Text style={styles.title}>Estado operativo</Text>
            <AdminInfoRow label="Portal de pacientes" value={operationStatus?.patient_portal_active ? 'Activo' : 'Inactivo'} />
            <AdminInfoRow label="Citas en línea" value={operationStatus?.online_appointments_active ? 'Activas' : 'Inactivas'} />
            <AdminInfoRow label="Atención presencial" value={operationStatus?.in_person_appointments_active ? 'Activa' : 'Inactiva'} />
            <AdminInfoRow label="Caja" value={operationStatus?.cash_open ? 'Hay caja abierta' : 'Sin caja abierta'} />
            <AdminInfoRow label="Rango fiscal" value={operationStatus?.valid_fiscal_range ? 'Vigente' : 'Requiere revisión'} />
            <Text style={styles.helper}>Los ajustes avanzados de flujo y fiscal se administran en la web para reducir cambios accidentales desde el móvil.</Text>
          </AppCard>

          <AppCard style={styles.card}>
            <Text style={styles.title}>Checklist administrativo</Text>
            {checklist.map((item) => (
              <View key={item.label} style={styles.checkRow}>
                <Text style={[styles.checkDot, item.ok ? styles.checkOk : styles.checkWarning]}>{item.ok ? '✓' : '!'}</Text>
                <View style={styles.checkText}>
                  <Text style={styles.checkLabel}>{item.label}</Text>
                  <Text style={styles.checkDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </AppCard>

          {(readiness?.errors?.length || readiness?.warnings?.length) ? (
            <AppCard style={styles.card}>
              <Text style={styles.title}>Alertas fiscales</Text>
              {readiness.errors?.map((item) => <Text key={`error-${item}`} style={styles.alertDanger}>• {item}</Text>)}
              {readiness.warnings?.map((item) => <Text key={`warning-${item}`} style={styles.alertWarning}>• {item}</Text>)}
            </AppCard>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rangos CAI</Text>
            {ranges.length === 0 ? <EmptyState description="No se encontraron rangos fiscales configurados." title="Sin rangos" /> : null}
            {sortedRanges.map((range) => {
              const remaining = getRemaining(range);
              const usedPercent = getUsedPercent(range);
              const health = getRangeHealth(range);
              return (
                <AppCard key={range.id} style={styles.rangeCard}>
                  <View style={styles.rangeHeader}>
                    <Text style={styles.rangeTitle}>{documentTypeLabel(range.document_type)}</Text>
                    <Text style={[styles.rangeBadge, styles[`${health}Text`]]}>{rangeHealthLabel(range)}</Text>
                  </View>
                  <Text style={styles.meta}>CAI: {range.cai ?? 'Sin CAI'}</Text>
                  <Text style={styles.meta}>Desde: {range.full_start_number ?? range.start_number ?? 'N/D'}</Text>
                  <Text style={styles.meta}>Hasta: {range.full_end_number ?? range.end_number ?? 'N/D'}</Text>
                  <Text style={styles.meta}>Actual: {range.current_number ?? 'N/D'} {remaining !== null ? `· Disponibles: ${remaining}` : ''}</Text>
                  <Text style={styles.meta}>Vence: {formatDate(range.expiration_date)} {daysUntil(range.expiration_date) !== null ? `· ${daysUntil(range.expiration_date)} días` : ''}</Text>
                  {usedPercent !== null ? (
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, styles[`${health}Fill`], { width: `${usedPercent}%` }]} />
                    </View>
                  ) : null}
                  {usedPercent !== null ? <Text style={styles.progressText}>Uso del rango: {usedPercent}%</Text> : null}
                </AppCard>
              );
            })}
          </View>
        </ScrollView>

        <Modal animationType="fade" transparent visible={editOpen}>
          <View style={styles.modalBackdrop}>
            <AppCard style={styles.modalCard}>
              <Text style={styles.title}>Editar clínica</Text>
              <Text style={styles.meta}>Actualiza solo datos administrativos básicos. Los datos fiscales sensibles deben validarse antes de emitir.</Text>
              <AppInput autoCapitalize="words" label="Nombre" onChangeText={(value) => setForm((current) => ({ ...current, nombre: value }))} sanitizer="name" value={form.nombre} />
              <AppInput autoCapitalize="none" keyboardType="email-address" label="Correo" onChangeText={(value) => setForm((current) => ({ ...current, correo: value }))} sanitizer="email" value={form.correo} />
              <AppInput keyboardType="phone-pad" label="Teléfono" onChangeText={(value) => setForm((current) => ({ ...current, telefono: value }))} sanitizer="phone" value={form.telefono} />
              <AppInput label="Dirección" multiline onChangeText={(value) => setForm((current) => ({ ...current, direccion: value }))} value={form.direccion} />
              <AppInput keyboardType="number-pad" label="RTN" maxLength={20} onChangeText={(value) => setForm((current) => ({ ...current, rtn: value }))} sanitizer="digits" value={form.rtn} />
              <View style={styles.modalActions}>
                <AppButton disabled={saving} label="Cancelar" onPress={() => setEditOpen(false)} variant="secondary" />
                <AppButton loading={saving} label="Guardar" onPress={saveClinic} />
              </View>
            </AppCard>
          </View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}

function validateClinicForm(form: ClinicForm) {
  if (form.nombre.trim().length < 3) return 'Ingresa el nombre de la clínica.';
  if (!isValidEmail(form.correo.trim().toLowerCase())) return 'Ingresa un correo válido.';
  if (!isValidPhone(phoneDigits(form.telefono))) return 'El teléfono debe tener entre 8 y 15 dígitos.';
  if (form.direccion.trim().length < 5) return 'Ingresa una dirección válida.';
  const rtn = form.rtn.replace(/\D/g, '');
  if (rtn.length < 8 || rtn.length > 20) return 'El RTN debe tener entre 8 y 20 dígitos.';
  return '';
}

function buildClinicChecklist({
  activeRanges,
  fiscalReady,
  missingFields,
  readiness,
  ranges,
}: {
  activeRanges: number;
  fiscalReady: boolean;
  missingFields: string[];
  readiness: AdminFiscalReadiness | null;
  ranges: AdminFiscalRange[];
}) {
  return [
    {
      description: missingFields.length ? `Completa: ${missingFields.join(', ')}.` : 'Los datos principales están disponibles.',
      label: 'Datos de clínica',
      ok: missingFields.length === 0,
    },
    {
      description: fiscalReady ? 'La clínica puede emitir documentos fiscales.' : readiness?.message ?? 'Falta validar perfil fiscal y CAI.',
      label: 'Perfil fiscal',
      ok: fiscalReady,
    },
    {
      description: activeRanges ? `${activeRanges} rango(s) disponible(s).` : 'No hay rangos activos para emitir.',
      label: 'Rango CAI activo',
      ok: activeRanges > 0,
    },
    {
      description: ranges.some((range) => isExpiringSoon(range.expiration_date)) ? 'Hay rangos que vencen en 15 días o menos.' : 'No hay vencimientos críticos detectados.',
      label: 'Vencimientos',
      ok: !ranges.some((range) => isExpiringSoon(range.expiration_date)),
    },
  ];
}

function getMissingClinicFields(clinic: AdminClinic | null) {
  const missing: string[] = [];
  if (!clinicName(clinic) || clinicName(clinic) === 'Clínica') missing.push('nombre');
  if (!clinicEmail(clinic) || clinicEmail(clinic).startsWith('Sin')) missing.push('correo');
  if (!clinicPhone(clinic) || clinicPhone(clinic).startsWith('Sin')) missing.push('teléfono');
  if (!(clinic?.direccion ?? clinic?.address)) missing.push('dirección');
  if (!clinic?.rtn) missing.push('RTN');
  return missing;
}

function getRemaining(range: AdminFiscalRange) {
  if (range.end_number === undefined || range.current_number === undefined) return null;
  return Math.max(range.end_number - range.current_number + 1, 0);
}

function getUsedPercent(range: AdminFiscalRange) {
  if (range.start_number === undefined || range.end_number === undefined || range.current_number === undefined) return null;
  const total = range.end_number - range.start_number + 1;
  if (total <= 0) return null;
  const used = Math.max(range.current_number - range.start_number, 0);
  return Math.min(Math.round((used / total) * 100), 100);
}

function getRangeHealth(range: AdminFiscalRange): RangeHealth {
  if (!range.is_active) return 'inactive';
  if (range.is_exhausted) return 'danger';
  if (isExpired(range.expiration_date)) return 'danger';
  if (isExpiringSoon(range.expiration_date)) return 'warning';
  const remaining = getRemaining(range);
  if (remaining !== null && remaining <= 10) return 'warning';
  return 'ok';
}

function rangeHealthLabel(range: AdminFiscalRange) {
  const health = getRangeHealth(range);
  if (range.is_exhausted) return 'Agotado';
  if (health === 'danger') return 'Vencido';
  if (health === 'warning') return 'Revisar';
  if (health === 'inactive') return 'Inactivo';
  return 'Activo';
}

function documentTypeLabel(type?: string) {
  if (type === 'invoice') return 'Factura';
  if (type === 'credit_note') return 'Nota de crédito';
  if (type === 'debit_note') return 'Nota de débito';
  if (type === 'receipt') return 'Recibo';
  return type ?? 'Documento fiscal';
}

function isExpired(date?: string) {
  const days = daysUntil(date);
  return days !== null && days < 0;
}

function isExpiringSoon(date?: string) {
  const days = daysUntil(date);
  return days !== null && days >= 0 && days <= 15;
}

function daysUntil(date?: string) {
  if (!date) return null;
  const expiration = new Date(`${date}T23:59:59`);
  if (Number.isNaN(expiration.getTime())) return null;
  return Math.ceil((expiration.getTime() - Date.now()) / 86_400_000);
}

const styles = StyleSheet.create({
  alertDanger: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  alertWarning: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  badge: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeOk: {
    backgroundColor: '#dcfce7',
    color: colors.success,
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: colors.warning,
  },
  card: {
    gap: 10,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  checkDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  checkDot: {
    borderRadius: 999,
    fontSize: 13,
    fontWeight: '900',
    height: 24,
    overflow: 'hidden',
    paddingTop: 3,
    textAlign: 'center',
    width: 24,
  },
  checkLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  checkOk: {
    backgroundColor: '#dcfce7',
    color: colors.success,
  },
  checkRow: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  checkText: {
    flex: 1,
    gap: 2,
  },
  checkWarning: {
    backgroundColor: '#fef3c7',
    color: colors.warning,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 120,
  },
  dangerFill: {
    backgroundColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
  },
  helper: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  inactiveFill: {
    backgroundColor: colors.muted,
  },
  inactiveText: {
    color: colors.muted,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  modalActions: {
    gap: 10,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  modalCard: {
    gap: 12,
    maxHeight: '92%',
  },
  okFill: {
    backgroundColor: colors.success,
  },
  okText: {
    color: colors.success,
  },
  progressFill: {
    borderRadius: 999,
    height: 8,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  rangeBadge: {
    fontSize: 12,
    fontWeight: '900',
  },
  rangeCard: {
    gap: 8,
  },
  rangeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  summaryCard: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 3,
    minHeight: 76,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  warningFill: {
    backgroundColor: colors.warning,
  },
  warningText: {
    color: colors.warning,
  },
});
