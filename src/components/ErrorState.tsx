import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

export function ErrorState({
  message,
  onRetry,
  title = 'Ocurrió un problema',
}: {
  message?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={34} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff7f7',
    borderColor: '#ffd0d0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
});
