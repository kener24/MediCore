import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { RolePlaceholderScreen } from '@/features/common/screens/RolePlaceholderScreen';
import { NurseDashboardScreen } from '@/features/nurse/screens/NurseDashboardScreen';
import { NurseHomeScreen } from '@/features/nurse/screens/NurseHomeScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();

export function NurseTabs() {
  return (
    <Tab.Navigator screenOptions={createTabOptions()}>
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
