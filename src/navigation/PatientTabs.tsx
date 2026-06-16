import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { ChangePasswordScreen } from '@/features/patient/screens/ChangePasswordScreen';
import { ClinicInfoScreen } from '@/features/patient/screens/ClinicInfoScreen';
import { EditPatientProfileScreen } from '@/features/patient/screens/EditPatientProfileScreen';
import { PatientAppointmentDetailScreen } from '@/features/patient/screens/PatientAppointmentDetailScreen';
import { PatientAppointmentsScreen } from '@/features/patient/screens/PatientAppointmentsScreen';
import { PatientDashboardScreen } from '@/features/patient/screens/PatientDashboardScreen';
import { PatientDocumentDetailScreen } from '@/features/patient/screens/PatientDocumentDetailScreen';
import { PatientDocumentsScreen } from '@/features/patient/screens/PatientDocumentsScreen';
import { PatientInvoiceDetailScreen } from '@/features/patient/screens/PatientInvoiceDetailScreen';
import { PatientInvoicesScreen } from '@/features/patient/screens/PatientInvoicesScreen';
import { PatientNotificationsScreen } from '@/features/patient/screens/PatientNotificationsScreen';
import { PatientPrescriptionDetailScreen } from '@/features/patient/screens/PatientPrescriptionDetailScreen';
import { PatientPrescriptionsScreen } from '@/features/patient/screens/PatientPrescriptionsScreen';
import { PatientProfileScreen } from '@/features/patient/screens/PatientProfileScreen';
import { RequestAppointmentScreen } from '@/features/patient/screens/RequestAppointmentScreen';
import { SettingsScreen } from '@/features/patient/screens/SettingsScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackOptions = { headerShown: false };

function PatientHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={PatientDashboardScreen} name="PatientDashboard" />
      <Stack.Screen component={RequestAppointmentScreen} name="RequestAppointment" />
      <Stack.Screen component={PatientAppointmentDetailScreen} name="PatientAppointmentDetail" />
      <Stack.Screen component={PatientPrescriptionsScreen} name="PatientPrescriptions" />
      <Stack.Screen component={PatientPrescriptionDetailScreen} name="PatientPrescriptionDetail" />
      <Stack.Screen component={PatientInvoicesScreen} name="PatientInvoices" />
      <Stack.Screen component={PatientInvoiceDetailScreen} name="PatientInvoiceDetail" />
      <Stack.Screen component={PatientDocumentDetailScreen} name="PatientDocumentDetail" />
    </Stack.Navigator>
  );
}

function PatientAppointmentsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={PatientAppointmentsScreen} name="PatientAppointments" />
      <Stack.Screen component={PatientAppointmentDetailScreen} name="PatientAppointmentDetail" />
      <Stack.Screen component={RequestAppointmentScreen} name="RequestAppointment" />
    </Stack.Navigator>
  );
}

function PatientDocumentsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={PatientDocumentsScreen} name="PatientDocuments" />
      <Stack.Screen component={PatientDocumentDetailScreen} name="PatientDocumentDetail" />
    </Stack.Navigator>
  );
}

function PatientNotificationsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={PatientNotificationsScreen} name="PatientNotifications" />
    </Stack.Navigator>
  );
}

function PatientProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={PatientProfileScreen} name="PatientProfile" />
      <Stack.Screen component={EditPatientProfileScreen} name="EditPatientProfile" />
      <Stack.Screen component={SettingsScreen} name="PatientSettings" />
      <Stack.Screen component={ChangePasswordScreen} name="ChangePassword" />
      <Stack.Screen component={ClinicInfoScreen} name="ClinicInfo" />
      <Stack.Screen component={PatientNotificationsScreen} name="PatientNotifications" />
    </Stack.Navigator>
  );
}

export function PatientTabs() {
  const insets = useSafeAreaInsets();
  return (
    <RoleGuard roles={['paciente']}>
      <Tab.Navigator screenOptions={createTabOptions(insets)}>
        <Tab.Screen
          component={PatientHomeStack}
          name="PatientHomeTab"
          options={{ tabBarIcon: tabIcon('home-heart'), title: 'Inicio' }}
        />
        <Tab.Screen
          component={PatientAppointmentsStack}
          name="PatientAppointmentsTab"
          options={{ tabBarIcon: tabIcon('calendar-check-outline'), title: 'Citas' }}
        />
        <Tab.Screen
          component={PatientDocumentsStack}
          name="PatientDocumentsTab"
          options={{ tabBarIcon: tabIcon('file-document-outline'), title: 'Documentos' }}
        />
        <Tab.Screen
          component={PatientNotificationsStack}
          name="PatientNotificationsTab"
          options={{ tabBarIcon: tabIcon('bell-outline'), title: 'Avisos' }}
        />
        <Tab.Screen
          component={PatientProfileStack}
          name="PatientProfileTab"
          options={{ tabBarIcon: tabIcon('account-circle-outline'), title: 'Perfil' }}
        />
      </Tab.Navigator>
    </RoleGuard>
  );
}
