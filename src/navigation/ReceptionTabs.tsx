import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { ReceptionAppointmentCheckInScreen } from '@/features/reception/screens/ReceptionAppointmentCheckInScreen';
import { ReceptionCreateAdmissionScreen } from '@/features/reception/screens/ReceptionCreateAdmissionScreen';
import { ReceptionDashboardScreen } from '@/features/reception/screens/ReceptionDashboardScreen';
import { ReceptionPatientCreateScreen } from '@/features/reception/screens/ReceptionPatientCreateScreen';
import { ReceptionPatientDetailScreen } from '@/features/reception/screens/ReceptionPatientDetailScreen';
import { ReceptionPatientSearchScreen } from '@/features/reception/screens/ReceptionPatientSearchScreen';
import { ReceptionProfileScreen } from '@/features/reception/screens/ReceptionProfileScreen';
import { ReceptionSecurityScreen } from '@/features/reception/screens/ReceptionSecurityScreen';
import { ReceptionTodayAdmissionsScreen } from '@/features/reception/screens/ReceptionTodayAdmissionsScreen';
import { ReceptionVisitDetailScreen } from '@/features/reception/screens/ReceptionVisitDetailScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

function ReceptionHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={ReceptionDashboardScreen} name="ReceptionDashboard" />
      <Stack.Screen component={ReceptionPatientSearchScreen} name="ReceptionPatientSearch" />
      <Stack.Screen component={ReceptionPatientCreateScreen} name="ReceptionPatientCreate" />
      <Stack.Screen component={ReceptionPatientDetailScreen} name="ReceptionPatientDetail" />
      <Stack.Screen component={ReceptionCreateAdmissionScreen} name="ReceptionCreateAdmission" />
      <Stack.Screen component={ReceptionAppointmentCheckInScreen} name="ReceptionAppointmentCheckIn" />
      <Stack.Screen component={ReceptionTodayAdmissionsScreen} name="ReceptionTodayAdmissions" />
      <Stack.Screen component={ReceptionVisitDetailScreen} name="ReceptionVisitDetail" />
    </Stack.Navigator>
  );
}

function ReceptionPatientsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={ReceptionPatientSearchScreen} name="ReceptionPatientSearch" />
      <Stack.Screen component={ReceptionPatientCreateScreen} name="ReceptionPatientCreate" />
      <Stack.Screen component={ReceptionPatientDetailScreen} name="ReceptionPatientDetail" />
      <Stack.Screen component={ReceptionCreateAdmissionScreen} name="ReceptionCreateAdmission" />
      <Stack.Screen component={ReceptionVisitDetailScreen} name="ReceptionVisitDetail" />
    </Stack.Navigator>
  );
}

function ReceptionAdmissionsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={ReceptionTodayAdmissionsScreen} name="ReceptionTodayAdmissions" />
      <Stack.Screen component={ReceptionCreateAdmissionScreen} name="ReceptionCreateAdmission" />
      <Stack.Screen component={ReceptionVisitDetailScreen} name="ReceptionVisitDetail" />
    </Stack.Navigator>
  );
}

function ReceptionAppointmentsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={ReceptionAppointmentCheckInScreen} name="ReceptionAppointmentCheckIn" />
      <Stack.Screen component={ReceptionVisitDetailScreen} name="ReceptionVisitDetail" />
    </Stack.Navigator>
  );
}

function ReceptionProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={ReceptionProfileScreen} name="ReceptionProfile" />
      <Stack.Screen component={ReceptionSecurityScreen} name="ReceptionSecurity" />
    </Stack.Navigator>
  );
}

export function ReceptionTabs() {
  const insets = useSafeAreaInsets();
  return (
    <RoleGuard roles={['recepcionista']}>
      <Tab.Navigator screenOptions={createTabOptions(insets)}>
        <Tab.Screen component={ReceptionHomeStack} name="ReceptionHomeTab" options={{ tabBarIcon: tabIcon('desk'), title: 'Inicio' }} />
        <Tab.Screen component={ReceptionPatientsStack} name="ReceptionPatientsTab" options={{ tabBarIcon: tabIcon('account-search-outline'), title: 'Pacientes' }} />
        <Tab.Screen component={ReceptionAdmissionsStack} name="ReceptionAdmissionsTab" options={{ tabBarIcon: tabIcon('clipboard-list-outline'), title: 'Admisiones' }} />
        <Tab.Screen component={ReceptionAppointmentsStack} name="ReceptionAppointmentsTab" options={{ tabBarIcon: tabIcon('calendar-check-outline'), title: 'Citas' }} />
        <Tab.Screen component={ReceptionProfileStack} name="ReceptionProfileTab" options={{ tabBarIcon: tabIcon('account-cog-outline'), title: 'Perfil' }} />
      </Tab.Navigator>
    </RoleGuard>
  );
}
