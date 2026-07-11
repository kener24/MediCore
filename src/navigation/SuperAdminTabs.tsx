import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuperAdminClinicsScreen } from '@/features/superadmin/screens/SuperAdminClinicsScreen';
import { SuperAdminControlScreen } from '@/features/superadmin/screens/SuperAdminControlScreen';
import { SuperAdminCreateClinicScreen } from '@/features/superadmin/screens/SuperAdminCreateClinicScreen';
import { SuperAdminHomeScreen } from '@/features/superadmin/screens/SuperAdminHomeScreen';
import { SuperAdminProfileScreen } from '@/features/superadmin/screens/SuperAdminProfileScreen';
import { SuperAdminUsersScreen } from '@/features/superadmin/screens/SuperAdminUsersScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

function SuperAdminClinicsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={SuperAdminClinicsScreen} name="SuperAdminClinics" />
      <Stack.Screen component={SuperAdminCreateClinicScreen} name="SuperAdminCreateClinic" />
    </Stack.Navigator>
  );
}

export function SuperAdminTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={createTabOptions(insets)}>
      <Tab.Screen component={SuperAdminHomeScreen} name="SuperAdminHomeTab" options={{ tabBarIcon: tabIcon('shield-crown-outline'), title: 'Inicio' }} />
      <Tab.Screen component={SuperAdminClinicsStack} name="SuperAdminClinicsTab" options={{ tabBarIcon: tabIcon('hospital-building'), title: 'Clínicas' }} />
      <Tab.Screen component={SuperAdminUsersScreen} name="SuperAdminUsersTab" options={{ tabBarIcon: tabIcon('account-supervisor-outline'), title: 'Usuarios' }} />
      <Tab.Screen component={SuperAdminControlScreen} name="SuperAdminControlTab" options={{ tabBarIcon: tabIcon('chart-timeline-variant'), title: 'Control' }} />
      <Tab.Screen component={SuperAdminProfileScreen} name="SuperAdminProfileTab" options={{ tabBarIcon: tabIcon('shield-key-outline'), title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

