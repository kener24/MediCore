import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { colors } from '@/core/theme/colors';

export function createTabOptions(): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: '#7a8796',
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '800',
    },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      height: 70,
      paddingBottom: 10,
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
