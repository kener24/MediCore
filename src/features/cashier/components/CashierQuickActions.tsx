import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';

export function CashierQuickActions({ onCashSession, onHistory, onPending, onProfile, onSearch }: { onCashSession: () => void; onHistory: () => void; onPending: () => void; onProfile: () => void; onSearch: () => void }) {
  const actions = [
    { icon: 'cash-register' as const, label: 'Caja', onPress: onCashSession },
    { icon: 'file-clock-outline' as const, label: 'Pendientes', onPress: onPending },
    { icon: 'file-search-outline' as const, label: 'Buscar', onPress: onSearch },
    { icon: 'cash-check' as const, label: 'Pagos', onPress: onHistory },
    { icon: 'account-cog-outline' as const, label: 'Perfil', onPress: onProfile },
  ];
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable key={action.label} onPress={action.onPress} style={styles.action}>
          <AppCard style={styles.card}>
            <MaterialCommunityIcons color={colors.primary} name={action.icon} size={24} />
            <Text style={styles.label}>{action.label}</Text>
          </AppCard>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { flexBasis: '47%', flexGrow: 1 },
  card: { alignItems: 'center', gap: 8, minHeight: 86 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '900' },
});
