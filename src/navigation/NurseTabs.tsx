import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { NurseCompletedTriagesScreen } from '@/features/nurse/screens/NurseCompletedTriagesScreen';
import { NurseDashboardScreen } from '@/features/nurse/screens/NurseDashboardScreen';
import { NurseNotificationsScreen } from '@/features/nurse/screens/NurseNotificationsScreen';
import { NursePatientDetailScreen } from '@/features/nurse/screens/NursePatientDetailScreen';
import { NursePatientsInTriageScreen } from '@/features/nurse/screens/NursePatientsInTriageScreen';
import { NurseProfileScreen } from '@/features/nurse/screens/NurseProfileScreen';
import { NurseSecurityScreen } from '@/features/nurse/screens/NurseSecurityScreen';
import { NurseTriageDetailScreen } from '@/features/nurse/screens/NurseTriageDetailScreen';
import { NurseTriageFormScreen } from '@/features/nurse/screens/NurseTriageFormScreen';
import { NurseTriageQueueScreen } from '@/features/nurse/screens/NurseTriageQueueScreen';
import { NurseVitalSignsFormScreen } from '@/features/nurse/screens/NurseVitalSignsFormScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

function NurseHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseDashboardScreen} name="NurseDashboard" />
      <Stack.Screen component={NurseNotificationsScreen} name="NurseNotifications" />
      <Stack.Screen component={NursePatientDetailScreen} name="NursePatientDetail" />
      <Stack.Screen component={NurseVitalSignsFormScreen} name="NurseVitalSignsForm" />
      <Stack.Screen component={NurseTriageFormScreen} name="NurseTriageForm" />
      <Stack.Screen component={NurseCompletedTriagesScreen} name="NurseCompletedTriages" />
      <Stack.Screen component={NurseTriageDetailScreen} name="NurseTriageDetail" />
    </Stack.Navigator>
  );
}

function NurseTriageStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseTriageQueueScreen} name="NurseTriageQueue" />
      <Stack.Screen component={NursePatientDetailScreen} name="NursePatientDetail" />
      <Stack.Screen component={NurseVitalSignsFormScreen} name="NurseVitalSignsForm" />
      <Stack.Screen component={NurseTriageFormScreen} name="NurseTriageForm" />
      <Stack.Screen component={NurseTriageDetailScreen} name="NurseTriageDetail" />
    </Stack.Navigator>
  );
}

function NurseVitalsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NursePatientsInTriageScreen} name="NursePatientsInTriage" />
      <Stack.Screen component={NursePatientDetailScreen} name="NursePatientDetail" />
      <Stack.Screen component={NurseVitalSignsFormScreen} name="NurseVitalSignsForm" />
      <Stack.Screen component={NurseTriageFormScreen} name="NurseTriageForm" />
    </Stack.Navigator>
  );
}

function NurseCompletedStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseCompletedTriagesScreen} name="NurseCompletedTriages" />
      <Stack.Screen component={NurseTriageDetailScreen} name="NurseTriageDetail" />
    </Stack.Navigator>
  );
}

function NurseProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseProfileScreen} name="NurseProfile" />
      <Stack.Screen component={NurseNotificationsScreen} name="NurseNotifications" />
      <Stack.Screen component={NurseSecurityScreen} name="NurseSecurity" />
    </Stack.Navigator>
  );
}

export function NurseTabs() {
  const insets = useSafeAreaInsets();
  return (
    <RoleGuard roles={['enfermera']}>
      <Tab.Navigator screenOptions={createTabOptions(insets)}>
        <Tab.Screen component={NurseHomeStack} name="NurseHomeTab" options={{ tabBarIcon: tabIcon('heart-pulse'), title: 'Inicio' }} />
        <Tab.Screen component={NurseTriageStack} name="NurseTriageTab" options={{ tabBarIcon: tabIcon('clipboard-account-outline'), title: 'Triaje' }} />
        <Tab.Screen component={NurseVitalsStack} name="NurseVitalsTab" options={{ tabBarIcon: tabIcon('pulse'), title: 'Signos' }} />
        <Tab.Screen component={NurseCompletedStack} name="NurseCompletedTab" options={{ tabBarIcon: tabIcon('format-list-checks'), title: 'Realizados' }} />
        <Tab.Screen component={NurseProfileStack} name="NurseProfileTab" options={{ tabBarIcon: tabIcon('account-heart-outline'), title: 'Perfil' }} />
      </Tab.Navigator>
    </RoleGuard>
  );
}
