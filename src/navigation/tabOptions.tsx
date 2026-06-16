import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { colors } from '@/core/theme/colors';

export function createTabOptions(insets?: EdgeInsets): BottomTabNavigationOptions {
  const bottomInset = insets?.bottom ?? 0;
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: '#7a8796',
    tabBarIconStyle: {
      marginBottom: 0,
      marginTop: 2,
    },
    tabBarItemStyle: {
      paddingVertical: 4,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 0,
      marginTop: 2,
    },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: 64 + bottomInset,
      paddingBottom: Math.max(bottomInset, 8),
      paddingTop: 8,
    },
  };
}

export function tabIcon(name: keyof typeof MaterialCommunityIcons.glyphMap) {
  function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <MaterialCommunityIcons color={color} name={name} size={size} />;
  }

  TabBarIcon.displayName = `TabIcon(${name})`;
  return TabBarIcon;
}
