import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

export function ErrorState({ message, title = 'Ocurrio un problema' }: { message?: string; title?: string }) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={34} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
  title: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
});
