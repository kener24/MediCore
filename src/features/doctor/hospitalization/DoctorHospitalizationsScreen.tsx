import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { getDoctorHospitalizations } from '@/features/doctor/hospitalization/doctorHospitalizationService';
import type { DoctorHospitalization } from '@/features/doctor/hospitalization/doctorHospitalization.types';

export function DoctorHospitalizationsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<DoctorHospitalization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try { setItems(await getDoctorHospitalizations()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los pacientes hospitalizados.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Cargando hospitalizados..." />;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    <AppHeader icon="hospital-building" title="Pacientes hospitalizados" subtitle="Seguimiento médico intrahospitalario." />
    {error ? <ErrorState title="No se pudieron cargar los hospitalizados" message={error} onRetry={() => void load()} /> : null}
    {!error && !items.length ? <EmptyState title="Sin pacientes hospitalizados" description="Los internamientos activos aparecerán aquí." /> : null}
    {items.map((item) => <Pressable key={item.id} onPress={() => navigation.navigate('DoctorHospitalizationDetail', { hospitalizationId: item.id })}><AppCard style={styles.card}><View style={styles.row}><Text style={styles.name}>{item.patient_name}</Text><Text style={styles.status}>{item.status}</Text></View><Text style={styles.meta}>{item.current_bed_code || 'Sin cama'} | {item.current_room || 'Sin habitación'}</Text><Text style={styles.reason}>{item.reason}</Text><Text style={styles.link}>Abrir seguimiento clínico</Text></AppCard></Pressable>)}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  content: { gap: 12, padding: 18, paddingBottom: 110 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13 },
  name: { color: colors.ink, flex: 1, fontSize: 17, fontWeight: '900' },
  reason: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  status: { color: colors.primary, fontSize: 12, fontWeight: '900' },
});
