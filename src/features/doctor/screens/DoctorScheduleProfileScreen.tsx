import { useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/core/theme/colors';
import { DoctorScheduleCard } from '@/features/doctor/components/DoctorProfileCards';
import { DoctorHeader } from '@/features/doctor/components/DoctorHeader';
import { getDoctorSchedule } from '@/features/doctor/services/doctorProfileService';
import type { DoctorScheduleItem } from '@/features/doctor/types/doctorProfile.types';

export function DoctorScheduleProfileScreen() {
  const route = useRoute();
  const params = useMemo(() => (route.params ?? {}) as { schedules?: DoctorScheduleItem[] }, [route.params]);
  const [schedules, setSchedules] = useState<DoctorScheduleItem[]>(params.schedules ?? []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!params.schedules);

  useEffect(() => {
    if (params.schedules) return;
    getDoctorSchedule()
      .then(setSchedules)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los horarios.'))
      .finally(() => setLoading(false));
  }, [params.schedules]);

  if (loading) return <LoadingState label="Cargando horarios de atención..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorHeader title="Horarios de atención" />
        {error ? <ErrorState message={error} title="No se pudieron cargar los horarios" /> : <DoctorScheduleCard schedules={schedules} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 128 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
