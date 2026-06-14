import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { RolePlaceholderScreen } from '@/features/common/screens/RolePlaceholderScreen';
import { ReceptionDashboardScreen } from '@/features/reception/screens/ReceptionDashboardScreen';
import { ReceptionHomeScreen } from '@/features/reception/screens/ReceptionHomeScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();

export function ReceptionTabs() {
  return (
    <Tab.Navigator screenOptions={createTabOptions()}>
      <Tab.Screen
        component={ReceptionHomeScreen}
        name="ReceptionHome"
        options={{ tabBarIcon: tabIcon('desk'), title: 'Inicio' }}
      />
      <Tab.Screen
        component={ReceptionDashboardScreen}
        name="ReceptionDashboard"
        options={{ tabBarIcon: tabIcon('view-dashboard-outline'), title: 'Resumen' }}
      />
      <Tab.Screen
        name="ReceptionPatients"
        options={{ tabBarIcon: tabIcon('account-multiple-outline'), title: 'Pacientes' }}>
        {() => <RolePlaceholderScreen description="Registro y busqueda" title="Pacientes" />}
      </Tab.Screen>
      <Tab.Screen
        name="ReceptionBilling"
        options={{ tabBarIcon: tabIcon('cash-register'), title: 'Caja' }}>
        {() => <RolePlaceholderScreen description="Cobros y facturas" title="Caja" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
