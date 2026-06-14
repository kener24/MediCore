import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors } from '@/core/theme/colors';

interface AppButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function AppButton({ disabled, label, loading, style, variant = 'primary', ...props }: AppButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        state.pressed && !isDisabled && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.palePrimary,
    borderColor: '#ccebe7',
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryText: {
    color: colors.primaryDark,
  },
});
