import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import {
  ConsultationCard,
  consultationId,
  patientId,
  patientName,
  visitId,
} from '@/features/doctor/components/ConsultationCard';
import { ConsultationFilters, type ConsultationQuickFilter } from '@/features/doctor/components/ConsultationFilters';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getDoctorConsultations } from '@/features/doctor/services/doctorConsultationService';
import type { DoctorConsultation } from '@/features/doctor/types/doctorConsultation.types';

export function DoctorConsultationsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<DoctorConsultation[]>([]);
  const [filter, setFilter] = useState<ConsultationQuickFilter>('today');
  const [date, setDate] = useState(todayString());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = {};
    if (filter === 'today') next.date = date || todayString();
    if (filter === 'in_progress') next.status = 'in_progress';
    if (filter === 'completed') next.status = 'completed';
    if (filter === 'draft') next.status = 'draft';
    if (filter === 'all' && date) next.date = date;
    if (search.trim()) next.search = search.trim();
    return next;
  }, [date, filter, search]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const text = [
        patientName(item),
        item.reason,
        item.chief_complaint,
        item.diagnosis_text,
        item.preliminary_diagnosis,
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(term);
    });
  }, [items, search]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await getDoctorConsultations(params));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las consultas médicas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openDetail(item: DoctorConsultation) {
    navigation.navigate('DoctorConsultationDetail', {
      consultationId: consultationId(item),
      patientId: patientId(item),
      visitId: visitId(item),
    });
  }

  function continueConsultation(item: DoctorConsultation) {
    navigation.navigate('DoctorConsultation', {
      consultationId: consultationId(item),
      patientId: patientId(item),
      visitId: visitId(item),
    });
  }

  function openSummary(item: DoctorConsultation) {
    navigation.navigate('DoctorConsultationSummary', {
      consultationId: consultationId(item),
      patientId: patientId(item),
      visitId: visitId(item),
    });
  }

  if (loading) return <LoadingState label="Cargando consultas médicas..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Consultas medicas" />
        <AppCard style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{items.length}</Text>
          <Text style={styles.summaryText}>consultas encontradas</Text>
        </AppCard>
        <ConsultationFilters
          date={date}
          filter={filter}
          onChangeDate={setDate}
          onChangeFilter={setFilter}
          onChangeSearch={setSearch}
          search={search}
        />
        {error ? (
          <ErrorState message={error} onRetry={() => load()} title="No se pudo cargar el módulo" />
        ) : filteredItems.length ? (
          filteredItems.map((item, index) => (
            <ConsultationCard
              item={item}
              key={consultationId(item) ?? `${patientName(item)}-${index}`}
              onContinue={() => continueConsultation(item)}
              onOpen={() => openDetail(item)}
              onSummary={() => openSummary(item)}
            />
          ))
        ) : (
          <EmptyState description={emptyDescription(filter)} title={emptyTitle(filter)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTitle(filter: ConsultationQuickFilter) {
  if (filter === 'today') return 'No hay consultas para hoy.';
  if (filter === 'in_progress') return 'No tienes consultas en progreso.';
  if (filter === 'completed') return 'No hay consultas finalizadas.';
  if (filter === 'draft') return 'No tienes borradores.';
  return 'No se encontraron consultas.';
}

function emptyDescription(filter: ConsultationQuickFilter) {
  if (filter === 'completed') return 'Las consultas finalizadas aparecerán en modo lectura.';
  if (filter === 'in_progress') return 'Cuando inicies una atención médica aparecerá aquí.';
  return 'Ajusta los filtros o intenta refrescar la pantalla.';
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  summaryCard: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  summaryNumber: { color: colors.primary, fontSize: 26, fontWeight: '900' },
  summaryText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
});
