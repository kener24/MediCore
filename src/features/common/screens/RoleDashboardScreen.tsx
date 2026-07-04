import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/core/theme/colors';

interface DashboardStat {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  tone?: 'primary' | 'blue' | 'warning';
  value: string;
}

interface RoleDashboardScreenProps {
  description: string;
  stats: DashboardStat[];
  title: string;
}

export function RoleDashboardScreen({ description, stats, title }: RoleDashboardScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader icon="view-dashboard-outline" subtitle={description} title={title} />

        <View style={styles.stats}>
          {stats.map((stat) => (
            <StatCard
              icon={stat.icon}
              key={stat.label}
              label={stat.label}
              tone={stat.tone}
              value={stat.value}
            />
          ))}
        </View>

        <AppCard style={styles.notice}>
          <Text style={styles.noticeTitle}>Módulo preparado</Text>
          <Text style={styles.noticeText}>
            Esta sección ya respeta el login, el rol y la estructura de navegación. En el
            siguiente sprint conectaremos los endpoints reales de MediCore.
          </Text>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 22,
    paddingBottom: 34,
  },
  notice: {
    marginTop: 18,
  },
  noticeText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  noticeTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
});
