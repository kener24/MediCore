import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { QuickActionCard } from '@/components/QuickActionCard';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';

export interface RoleAction {
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
}

interface RoleHomeScreenProps {
  actions: RoleAction[];
  headline: string;
  roleLabel: string;
  subtitle: string;
}

export function RoleHomeScreen({ actions, headline, roleLabel, subtitle }: RoleHomeScreenProps) {
  const { signOut, user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader
          subtitle={user?.clinica_nombre || user?.email || 'MediCore'}
          title={user?.nombre_completo || 'Usuario'}
        />

        <View style={styles.hero}>
          <Text style={styles.role}>{roleLabel}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.actions}>
          {actions.map((action) => (
            <QuickActionCard
              description={action.description}
              icon={action.icon}
              key={action.title}
              title={action.title}
            />
          ))}
        </View>

        <AppButton label="Cerrar sesión" onPress={signOut} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginBottom: 18,
  },
  content: {
    padding: 22,
    paddingBottom: 34,
  },
  headline: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  hero: {
    backgroundColor: colors.darkPanel,
    borderRadius: 24,
    marginVertical: 22,
    padding: 22,
  },
  role: {
    alignSelf: 'flex-start',
    backgroundColor: '#d9f7f3',
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 18,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
});
