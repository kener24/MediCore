import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { AdminClinicScreen } from '@/features/admin/screens/AdminClinicScreen';
import { AdminAlertsScreen } from '@/features/admin/screens/AdminAlertsScreen';
import { AdminDoctorSchedulesScreen } from '@/features/admin/screens/AdminDoctorSchedulesScreen';
import { AdminCreateStaffScreen } from '@/features/admin/screens/AdminCreateStaffScreen';
import { AdminDashboardScreen } from '@/features/admin/screens/AdminDashboardScreen';
import { AdminEditUserScreen } from '@/features/admin/screens/AdminEditUserScreen';
import { AdminHomeScreen } from '@/features/admin/screens/AdminHomeScreen';
import { AdminProfileScreen } from '@/features/admin/screens/AdminProfileScreen';
import { AdminReportsScreen } from '@/features/admin/screens/AdminReportsScreen';
import { AdminUserDetailScreen } from '@/features/admin/screens/AdminUserDetailScreen';
import { AdminUsersScreen } from '@/features/admin/screens/AdminUsersScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

function AdminHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={AdminHomeScreen} name="AdminHomeMain" />
      <Stack.Screen component={AdminProfileScreen} name="AdminProfile" />
      <Stack.Screen component={AdminAlertsScreen} name="AdminAlerts" />
    </Stack.Navigator>
  );
}

function AdminUsersStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={AdminUsersScreen} name="AdminUsersList" />
      <Stack.Screen component={AdminCreateStaffScreen} name="AdminCreateStaff" />
      <Stack.Screen component={AdminUserDetailScreen} name="AdminUserDetail" />
      <Stack.Screen component={AdminEditUserScreen} name="AdminEditUser" />
      <Stack.Screen component={AdminDoctorSchedulesScreen} name="AdminDoctorSchedules" />
    </Stack.Navigator>
  );
}

function AdminDashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={AdminDashboardScreen} name="AdminDashboardMain" />
      <Stack.Screen component={AdminAlertsScreen} name="AdminAlerts" />
    </Stack.Navigator>
  );
}

export function AdminTabs() {
  const insets = useSafeAreaInsets();
  return (
    <RoleGuard roles={['admin']}>
      <Tab.Navigator screenOptions={createTabOptions(insets)}>
        <Tab.Screen component={AdminHomeStack} name="AdminHome" options={{ tabBarIcon: tabIcon('shield-account-outline'), title: 'Inicio' }} />
        <Tab.Screen component={AdminDashboardStack} name="AdminDashboard" options={{ tabBarIcon: tabIcon('view-dashboard-outline'), title: 'Resumen' }} />
        <Tab.Screen component={AdminUsersStack} name="AdminUsers" options={{ tabBarIcon: tabIcon('account-cog-outline'), title: 'Equipo' }} />
        <Tab.Screen component={AdminClinicScreen} name="AdminClinic" options={{ tabBarIcon: tabIcon('domain'), title: 'Clínica' }} />
        <Tab.Screen component={AdminReportsScreen} name="AdminReports" options={{ tabBarIcon: tabIcon('chart-box-outline'), title: 'Control' }} />
      </Tab.Navigator>
    </RoleGuard>
  );
}
