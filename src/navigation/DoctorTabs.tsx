import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { DoctorClinicalConsumptionScreen } from '@/features/doctor/screens/DoctorClinicalConsumptionScreen';
import { DoctorClinicalAttachmentsScreen } from '@/features/doctor/screens/DoctorClinicalAttachmentsScreen';
import { DoctorConsultationDetailScreen } from '@/features/doctor/screens/DoctorConsultationDetailScreen';
import { DoctorConsultationHistoryScreen } from '@/features/doctor/screens/DoctorConsultationHistoryScreen';
import { DoctorConsultationScreen } from '@/features/doctor/screens/DoctorConsultationScreen';
import { DoctorConsultationSummaryScreen } from '@/features/doctor/screens/DoctorConsultationSummaryScreen';
import { DoctorConsultationsScreen } from '@/features/doctor/screens/DoctorConsultationsScreen';
import { DoctorDashboardScreen } from '@/features/doctor/screens/DoctorDashboardScreen';
import { DoctorChangePasswordScreen } from '@/features/doctor/screens/DoctorChangePasswordScreen';
import { DoctorEditProfileScreen } from '@/features/doctor/screens/DoctorEditProfileScreen';
import { DoctorMedicalOrderDetailScreen } from '@/features/doctor/screens/DoctorMedicalOrderDetailScreen';
import { DoctorMedicalOrderScreen } from '@/features/doctor/screens/DoctorMedicalOrderScreen';
import { DoctorNotificationsScreen } from '@/features/doctor/screens/DoctorNotificationsScreen';
import { DoctorPatientDetailScreen } from '@/features/doctor/screens/DoctorPatientDetailScreen';
import { DoctorPrescriptionDetailScreen } from '@/features/doctor/screens/DoctorPrescriptionDetailScreen';
import { DoctorPrescriptionScreen } from '@/features/doctor/screens/DoctorPrescriptionScreen';
import { DoctorProfileScreen } from '@/features/doctor/screens/DoctorProfileScreen';
import { DoctorScheduleScreen } from '@/features/doctor/screens/DoctorScheduleScreen';
import { DoctorScheduleProfileScreen } from '@/features/doctor/screens/DoctorScheduleProfileScreen';
import { DoctorSecurityScreen } from '@/features/doctor/screens/DoctorSecurityScreen';
import { DoctorTriageDetailScreen } from '@/features/doctor/screens/DoctorTriageDetailScreen';
import { DoctorWaitingRoomScreen } from '@/features/doctor/screens/DoctorWaitingRoomScreen';
import { DoctorHospitalizationDetailScreen } from '@/features/doctor/hospitalization/DoctorHospitalizationDetailScreen';
import { DoctorHospitalizationsScreen } from '@/features/doctor/hospitalization/DoctorHospitalizationsScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

function DoctorHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorDashboardScreen} name="DoctorDashboard" />
      <Stack.Screen component={DoctorHospitalizationsScreen} name="DoctorHospitalizations" />
      <Stack.Screen component={DoctorHospitalizationDetailScreen} name="DoctorHospitalizationDetail" />
      <Stack.Screen component={DoctorNotificationsScreen} name="DoctorNotifications" />
      <Stack.Screen component={DoctorPatientDetailScreen} name="DoctorPatientDetail" />
      <Stack.Screen component={DoctorTriageDetailScreen} name="DoctorTriageDetail" />
      <Stack.Screen component={DoctorConsultationScreen} name="DoctorConsultation" />
      <Stack.Screen component={DoctorConsultationDetailScreen} name="DoctorConsultationDetail" />
      <Stack.Screen component={DoctorConsultationHistoryScreen} name="DoctorConsultationHistory" />
      <Stack.Screen component={DoctorPrescriptionScreen} name="DoctorPrescription" />
      <Stack.Screen component={DoctorPrescriptionDetailScreen} name="DoctorPrescriptionDetail" />
      <Stack.Screen component={DoctorMedicalOrderScreen} name="DoctorMedicalOrder" />
      <Stack.Screen component={DoctorMedicalOrderDetailScreen} name="DoctorMedicalOrderDetail" />
      <Stack.Screen component={DoctorClinicalConsumptionScreen} name="DoctorClinicalConsumption" />
      <Stack.Screen component={DoctorClinicalAttachmentsScreen} name="DoctorClinicalAttachments" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorConsultationSummary" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorCompleteConsultation" />
    </Stack.Navigator>
  );
}

function DoctorScheduleStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorScheduleScreen} name="DoctorSchedule" />
      <Stack.Screen component={DoctorPatientDetailScreen} name="DoctorPatientDetail" />
      <Stack.Screen component={DoctorConsultationScreen} name="DoctorConsultation" />
      <Stack.Screen component={DoctorConsultationDetailScreen} name="DoctorConsultationDetail" />
      <Stack.Screen component={DoctorConsultationHistoryScreen} name="DoctorConsultationHistory" />
      <Stack.Screen component={DoctorPrescriptionScreen} name="DoctorPrescription" />
      <Stack.Screen component={DoctorPrescriptionDetailScreen} name="DoctorPrescriptionDetail" />
      <Stack.Screen component={DoctorMedicalOrderScreen} name="DoctorMedicalOrder" />
      <Stack.Screen component={DoctorMedicalOrderDetailScreen} name="DoctorMedicalOrderDetail" />
      <Stack.Screen component={DoctorClinicalConsumptionScreen} name="DoctorClinicalConsumption" />
      <Stack.Screen component={DoctorClinicalAttachmentsScreen} name="DoctorClinicalAttachments" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorConsultationSummary" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorCompleteConsultation" />
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
      <Stack.Screen component={DoctorConsultationDetailScreen} name="DoctorConsultationDetail" />
      <Stack.Screen component={DoctorConsultationHistoryScreen} name="DoctorConsultationHistory" />
      <Stack.Screen component={DoctorPrescriptionScreen} name="DoctorPrescription" />
      <Stack.Screen component={DoctorPrescriptionDetailScreen} name="DoctorPrescriptionDetail" />
      <Stack.Screen component={DoctorMedicalOrderScreen} name="DoctorMedicalOrder" />
      <Stack.Screen component={DoctorMedicalOrderDetailScreen} name="DoctorMedicalOrderDetail" />
      <Stack.Screen component={DoctorClinicalConsumptionScreen} name="DoctorClinicalConsumption" />
      <Stack.Screen component={DoctorClinicalAttachmentsScreen} name="DoctorClinicalAttachments" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorConsultationSummary" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorCompleteConsultation" />
    </Stack.Navigator>
  );
}

function DoctorConsultationsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorConsultationsScreen} name="DoctorConsultations" />
      <Stack.Screen component={DoctorConsultationScreen} name="DoctorConsultation" />
      <Stack.Screen component={DoctorConsultationDetailScreen} name="DoctorConsultationDetail" />
      <Stack.Screen component={DoctorConsultationHistoryScreen} name="DoctorConsultationHistory" />
      <Stack.Screen component={DoctorPrescriptionScreen} name="DoctorPrescription" />
      <Stack.Screen component={DoctorPrescriptionDetailScreen} name="DoctorPrescriptionDetail" />
      <Stack.Screen component={DoctorMedicalOrderScreen} name="DoctorMedicalOrder" />
      <Stack.Screen component={DoctorMedicalOrderDetailScreen} name="DoctorMedicalOrderDetail" />
      <Stack.Screen component={DoctorClinicalConsumptionScreen} name="DoctorClinicalConsumption" />
      <Stack.Screen component={DoctorClinicalAttachmentsScreen} name="DoctorClinicalAttachments" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorConsultationSummary" />
      <Stack.Screen component={DoctorConsultationSummaryScreen} name="DoctorCompleteConsultation" />
    </Stack.Navigator>
  );
}

function DoctorProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={DoctorProfileScreen} name="DoctorProfile" />
      <Stack.Screen component={DoctorEditProfileScreen} name="DoctorEditProfile" />
      <Stack.Screen component={DoctorChangePasswordScreen} name="DoctorChangePassword" />
      <Stack.Screen component={DoctorSecurityScreen} name="DoctorSecurity" />
      <Stack.Screen component={DoctorScheduleProfileScreen} name="DoctorScheduleProfile" />
      <Stack.Screen component={DoctorNotificationsScreen} name="DoctorNotifications" />
    </Stack.Navigator>
  );
}

export function DoctorTabs() {
  const insets = useSafeAreaInsets();
  return (
    <RoleGuard roles={['medico', 'doctor']}>
      <Tab.Navigator screenOptions={createTabOptions(insets)}>
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
