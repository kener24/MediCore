import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';

export function SessionExpiredScreen({ message, onContinue }: { message: string; onContinue: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons color={colors.warning} name="clock-alert-outline" size={36} />
        </View>
        <Text style={styles.title}>Tu sesión venció</Text>
        <Text style={styles.message}>{message}</Text>
        <AppButton label="Volver a iniciar sesión" onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: 18, margin: 22, padding: 24 },
  iconBox: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#fff7e6', borderRadius: 16, height: 70, justifyContent: 'center', width: 70 },
  message: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  safeArea: { backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900', textAlign: 'center' },
});
