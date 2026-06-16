import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RolePlaceholderScreen } from '@/features/common/screens/RolePlaceholderScreen';
import { NurseDashboardScreen } from '@/features/nurse/screens/NurseDashboardScreen';
import { NurseHomeScreen } from '@/features/nurse/screens/NurseHomeScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();

export function NurseTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={createTabOptions(insets)}>
      <Tab.Screen
        component={NurseHomeScreen}
        name="NurseHome"
        options={{ tabBarIcon: tabIcon('heart-pulse'), title: 'Inicio' }}
      />
      <Tab.Screen
        component={NurseDashboardScreen}
        name="NurseDashboard"
        options={{ tabBarIcon: tabIcon('view-dashboard-outline'), title: 'Resumen' }}
      />
      <Tab.Screen
        name="NurseTriage"
        options={{ tabBarIcon: tabIcon('clipboard-account-outline'), title: 'Triaje' }}>
        {() => <RolePlaceholderScreen description="Evaluacion inicial" title="Triaje" />}
      </Tab.Screen>
      <Tab.Screen
        name="NurseVitals"
        options={{ tabBarIcon: tabIcon('pulse'), title: 'Signos' }}>
        {() => <RolePlaceholderScreen description="Signos vitales" title="Signos" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
