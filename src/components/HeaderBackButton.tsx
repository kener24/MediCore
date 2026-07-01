import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/core/theme/colors';

export function HeaderBackButton() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;

  return (
    <Pressable accessibilityLabel="Volver atras" hitSlop={10} onPress={() => navigation.goBack()} style={styles.button}>
      <MaterialCommunityIcons color={colors.primaryDark} name="chevron-left" size={28} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 46,
  },
});
