import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/core/theme/colors';

interface AppInputProps extends TextInputProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onPressRightIcon?: () => void;
}

export function AppInput({ icon, label, onPressRightIcon, rightIcon, style, ...props }: AppInputProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.shell}>
        {icon ? <MaterialCommunityIcons color={colors.muted} name={icon} size={20} /> : null}
        <TextInput placeholderTextColor="#98a2b3" style={[styles.input, style]} {...props} />
        {rightIcon ? (
          <Pressable hitSlop={10} onPress={onPressRightIcon}>
            <MaterialCommunityIcons color={colors.muted} name={rightIcon} size={21} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  shell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
});
