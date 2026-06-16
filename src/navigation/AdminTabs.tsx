import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminDashboardScreen } from '@/features/admin/screens/AdminDashboardScreen';
import { AdminHomeScreen } from '@/features/admin/screens/AdminHomeScreen';
import { RolePlaceholderScreen } from '@/features/common/screens/RolePlaceholderScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();

export function AdminTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={createTabOptions(insets)}>
      <Tab.Screen
        component={AdminHomeScreen}
        name="AdminHome"
        options={{ tabBarIcon: tabIcon('shield-account-outline'), title: 'Inicio' }}
      />
      <Tab.Screen
        component={AdminDashboardScreen}
        name="AdminDashboard"
        options={{ tabBarIcon: tabIcon('view-dashboard-outline'), title: 'Resumen' }}
      />
      <Tab.Screen
        name="AdminUsers"
        options={{ tabBarIcon: tabIcon('account-cog-outline'), title: 'Usuarios' }}>
        {() => <RolePlaceholderScreen description="Roles y permisos" title="Usuarios" />}
      </Tab.Screen>
      <Tab.Screen
        name="AdminReports"
        options={{ tabBarIcon: tabIcon('chart-box-outline'), title: 'Reportes' }}>
        {() => <RolePlaceholderScreen description="Indicadores de la clínica" title="Reportes" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
