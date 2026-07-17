import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import { AdminInfoRow, AdminStatusCard } from '@/features/admin/components/AdminCards';
import {
  clinicEmail,
  clinicName,
  clinicPhone,
  getAdminClinic,
  getAdminFiscalRanges,
  getAdminFiscalReadiness,
} from '@/features/admin/services/adminService';
import type { AdminClinic, AdminFiscalRange, AdminFiscalReadiness } from '@/features/admin/types/admin.types';
import { formatDate } from '@/features/patient/utils/formatters';

export function AdminClinicScreen() {
  const [clinic, setClinic] = useState<AdminClinic | null>(null);
  const [readiness, setReadiness] = useState<AdminFiscalReadiness | null>(null);
  const [ranges, setRanges] = useState<AdminFiscalRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextClinic, nextReadiness, nextRanges] = await Promise.all([
        getAdminClinic(),
        getAdminFiscalReadiness().catch(() => null),
        getAdminFiscalRanges().catch(() => []),
      ]);
      setClinic(nextClinic);
      setReadiness(nextReadiness);
      setRanges(nextRanges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información de la clínica.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Cargando clínica..." />;

  const fiscalReady = Boolean(readiness?.ready ?? readiness?.is_ready ?? (readiness?.profile_complete && readiness?.has_active_range));
  const sortedRanges = [...ranges].sort((a, b) => Number(b.is_active) - Number(a.is_active) || String(a.expiration_date ?? '').localeCompare(String(b.expiration_date ?? '')));

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="domain" subtitle="Datos generales y control fiscal básico." title="Clínica y fiscal" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Clínica no disponible" /> : null}

          <AppCard>
            <AdminInfoRow label="Nombre" value={clinicName(clinic)} />
            <AdminInfoRow label="Correo" value={clinicEmail(clinic)} />
            <AdminInfoRow label="Teléfono" value={clinicPhone(clinic)} />
            <AdminInfoRow label="Dirección" value={clinic?.direccion ?? clinic?.address} />
            <AdminInfoRow label="RTN" value={clinic?.rtn} />
          </AppCard>

          <AdminStatusCard
            description={fiscalReady ? 'Perfil fiscal y rango activo disponibles para emitir.' : readiness?.message ?? 'Revisa configuración fiscal desde el panel web antes de emitir.'}
            icon={fiscalReady ? 'file-certificate-outline' : 'alert-circle-outline'}
            title={fiscalReady ? 'Facturación fiscal habilitada' : 'Facturación fiscal pendiente'}
            tone={fiscalReady ? 'primary' : 'warning'}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rangos CAI</Text>
            {ranges.length === 0 ? <EmptyState description="No se encontraron rangos fiscales configurados." title="Sin rangos" /> : null}
            {sortedRanges.map((range) => {
              const remaining = range.end_number && range.current_number ? Math.max(range.end_number - range.current_number + 1, 0) : null;
              const expiresSoon = isExpiringSoon(range.expiration_date);
              return (
              <AppCard key={range.id} style={styles.rangeCard}>
                <View style={styles.rangeHeader}>
                  <Text style={styles.rangeTitle}>{range.document_type ?? 'Factura'}</Text>
                  <Text style={[styles.rangeBadge, range.is_active && !expiresSoon ? styles.active : styles.inactive]}>
                    {range.is_exhausted ? 'Agotado' : expiresSoon ? 'Por vencer' : range.is_active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
                <Text style={styles.meta}>CAI: {range.cai ?? 'Sin CAI'}</Text>
                <Text style={styles.meta}>Desde: {range.full_start_number ?? range.start_number ?? 'N/D'}</Text>
                <Text style={styles.meta}>Hasta: {range.full_end_number ?? range.end_number ?? 'N/D'}</Text>
                <Text style={styles.meta}>Actual: {range.current_number ?? 'N/D'} {remaining !== null ? `· Disponibles: ${remaining}` : ''}</Text>
                <Text style={styles.meta}>Vence: {formatDate(range.expiration_date)}</Text>
              </AppCard>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

function isExpiringSoon(date?: string) {
  if (!date) return false;
  const expiration = new Date(`${date}T23:59:59`);
  if (Number.isNaN(expiration.getTime())) return false;
  const days = Math.ceil((expiration.getTime() - Date.now()) / 86_400_000);
  return days >= 0 && days <= 15;
}

const styles = StyleSheet.create({
  active: {
    color: colors.primaryDark,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 120,
  },
  inactive: {
    color: colors.danger,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  rangeBadge: {
    fontSize: 12,
    fontWeight: '900',
  },
  rangeCard: {
    gap: 7,
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
    textTransform: 'capitalize',
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
});
