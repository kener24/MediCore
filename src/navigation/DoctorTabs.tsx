import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { RolePlaceholderScreen } from '@/features/common/screens/RolePlaceholderScreen';
import { DoctorDashboardScreen } from '@/features/doctor/screens/DoctorDashboardScreen';
import { DoctorHomeScreen } from '@/features/doctor/screens/DoctorHomeScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();

export function DoctorTabs() {
  return (
    <Tab.Navigator screenOptions={createTabOptions()}>
      <Tab.Screen
        component={DoctorHomeScreen}
        name="DoctorHome"
        options={{ tabBarIcon: tabIcon('stethoscope'), title: 'Inicio' }}
      />
      <Tab.Screen
        component={DoctorDashboardScreen}
        name="DoctorDashboard"
        options={{ tabBarIcon: tabIcon('view-dashboard-outline'), title: 'Resumen' }}
      />
      <Tab.Screen
        name="DoctorSchedule"
        options={{ tabBarIcon: tabIcon('calendar-account-outline'), title: 'Agenda' }}>
        {() => <RolePlaceholderScreen description="Consultas programadas" title="Mi agenda" />}
      </Tab.Screen>
      <Tab.Screen
        name="DoctorRecords"
        options={{ tabBarIcon: tabIcon('clipboard-pulse-outline'), title: 'Expediente' }}>
        {() => <RolePlaceholderScreen description="Acceso clinico autorizado" title="Expedientes" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
