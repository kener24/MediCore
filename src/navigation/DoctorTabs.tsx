import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RoleGuard } from '@/components/RoleGuard';
import { DoctorClinicalConsumptionScreen } from '@/features/doctor/screens/DoctorClinicalConsumptionScreen';
import { DoctorConsultationScreen } from '@/features/doctor/screens/DoctorConsultationScreen';
import { DoctorDashboardScreen } from '@/features/doctor/screens/DoctorDashboardScreen';
import { DoctorMedicalOrderScreen } from '@/features/doctor/screens/DoctorMedicalOrderScreen';
import { DoctorNotificationsScreen } from '@/features/doctor/screens/DoctorNotificationsScreen';
import { DoctorPatientDetailScreen } from '@/features/doctor/screens/DoctorPatientDetailScreen';
import { DoctorPrescriptionScreen } from '@/features/doctor/screens/DoctorPrescriptionScreen';
import { DoctorProfileScreen } from '@/features/doctor/screens/DoctorProfileScreen';
import { DoctorScheduleScreen } from '@/features/doctor/screens/DoctorScheduleScreen';
import { DoctorTriageDetailScreen } from '@/features/doctor/screens/DoctorTriageDetailScreen';
import { DoctorWaitingRoomScreen } from '@/features/doctor/screens/DoctorWaitingRoomScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

function DoctorHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorDashboardScreen} name="DoctorDashboard" />
      <Stack.Screen component={DoctorNotificationsScreen} name="DoctorNotifications" />
      <Stack.Screen component={DoctorPatientDetailScreen} name="DoctorPatientDetail" />
      <Stack.Screen component={DoctorTriageDetailScreen} name="DoctorTriageDetail" />
      <Stack.Screen component={DoctorConsultationScreen} name="DoctorConsultation" />
      <Stack.Screen component={DoctorPrescriptionScreen} name="DoctorPrescription" />
      <Stack.Screen component={DoctorMedicalOrderScreen} name="DoctorMedicalOrder" />
      <Stack.Screen component={DoctorClinicalConsumptionScreen} name="DoctorClinicalConsumption" />
    </Stack.Navigator>
  );
}

function DoctorScheduleStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorScheduleScreen} name="DoctorSchedule" />
      <Stack.Screen component={DoctorPatientDetailScreen} name="DoctorPatientDetail" />
      <Stack.Screen component={DoctorConsultationScreen} name="DoctorConsultation" />
      <Stack.Screen component={DoctorTriageDetailScreen} name="DoctorTriageDetail" />
    </Stack.Navigator>
  );
}

function DoctorWaitingRoomStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorWaitingRoomScreen} name="DoctorWaitingRoom" />
      <Stack.Screen component={DoctorPatientDetailScreen} name="DoctorPatientDetail" />
      <Stack.Screen component={DoctorTriageDetailScreen} name="DoctorTriageDetail" />
      <Stack.Screen component={DoctorConsultationScreen} name="DoctorConsultation" />
      <Stack.Screen component={DoctorPrescriptionScreen} name="DoctorPrescription" />
      <Stack.Screen component={DoctorMedicalOrderScreen} name="DoctorMedicalOrder" />
      <Stack.Screen component={DoctorClinicalConsumptionScreen} name="DoctorClinicalConsumption" />
    </Stack.Navigator>
  );
}

function DoctorConsultationsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorConsultationScreen} name="DoctorConsultation" />
      <Stack.Screen component={DoctorPrescriptionScreen} name="DoctorPrescription" />
      <Stack.Screen component={DoctorMedicalOrderScreen} name="DoctorMedicalOrder" />
      <Stack.Screen component={DoctorClinicalConsumptionScreen} name="DoctorClinicalConsumption" />
    </Stack.Navigator>
  );
}

function DoctorProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorProfileScreen} name="DoctorProfile" />
      <Stack.Screen component={DoctorNotificationsScreen} name="DoctorNotifications" />
    </Stack.Navigator>
  );
}

export function DoctorTabs() {
  return (
    <RoleGuard roles={['medico', 'doctor']}>
      <Tab.Navigator screenOptions={createTabOptions()}>
        <Tab.Screen
          component={DoctorHomeStack}
          name="DoctorHomeTab"
          options={{ tabBarIcon: tabIcon('stethoscope'), title: 'Inicio' }}
        />
        <Tab.Screen
          component={DoctorScheduleStack}
          name="DoctorScheduleTab"
          options={{ tabBarIcon: tabIcon('calendar-account-outline'), title: 'Agenda' }}
        />
        <Tab.Screen
          component={DoctorWaitingRoomStack}
          name="DoctorWaitingRoomTab"
          options={{ tabBarIcon: tabIcon('account-clock-outline'), title: 'Sala' }}
        />
        <Tab.Screen
          component={DoctorConsultationsStack}
          name="DoctorConsultationsTab"
          options={{ tabBarIcon: tabIcon('clipboard-pulse-outline'), title: 'Consultas' }}
        />
        <Tab.Screen
          component={DoctorProfileStack}
          name="DoctorProfileTab"
          options={{ tabBarIcon: tabIcon('account-circle-outline'), title: 'Perfil' }}
        />
      </Tab.Navigator>
    </RoleGuard>
  );
}
