import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { RolePlaceholderScreen } from '@/features/common/screens/RolePlaceholderScreen';
import { PatientDashboardScreen } from '@/features/patient/screens/PatientDashboardScreen';
import { PatientHomeScreen } from '@/features/patient/screens/PatientHomeScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();

export function PatientTabs() {
  return (
    <Tab.Navigator screenOptions={createTabOptions()}>
      <Tab.Screen
        component={PatientHomeScreen}
        name="PatientHome"
        options={{ tabBarIcon: tabIcon('home-heart'), title: 'Inicio' }}
      />
      <Tab.Screen
        component={PatientDashboardScreen}
        name="PatientDashboard"
        options={{ tabBarIcon: tabIcon('view-dashboard-outline'), title: 'Resumen' }}
      />
      <Tab.Screen
        name="PatientAppointments"
        options={{ tabBarIcon: tabIcon('calendar-check-outline'), title: 'Citas' }}>
        {() => <RolePlaceholderScreen description="Agenda del paciente" title="Mis citas" />}
      </Tab.Screen>
      <Tab.Screen
        name="PatientProfile"
        options={{ tabBarIcon: tabIcon('account-circle-outline'), title: 'Perfil' }}>
        {() => <RolePlaceholderScreen description="Informacion personal" title="Mi perfil" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
