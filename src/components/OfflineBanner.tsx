import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { subscribeConnectivity } from '@/core/network/connectivity';
import { colors } from '@/core/theme/colors';

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => subscribeConnectivity(setOnline), []);

  if (online) return null;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons color={colors.white} name="wifi-off" size={17} />
      <Text style={styles.text}>Sin conexión. Estás viendo la última información disponible. Las acciones requieren internet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.warning,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  text: {
    color: colors.white,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
});
