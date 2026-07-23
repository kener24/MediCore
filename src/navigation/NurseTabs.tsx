import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { NurseCompletedTriagesScreen } from '@/features/nurse/screens/NurseCompletedTriagesScreen';
import { NurseChangePasswordScreen } from '@/features/nurse/screens/NurseChangePasswordScreen';
import { NurseDashboardScreen } from '@/features/nurse/screens/NurseDashboardScreen';
import { NurseBedStatusScreen } from '@/features/nurse/hospitalization/screens/NurseBedStatusScreen';
import { NurseHospitalizationDashboardScreen } from '@/features/nurse/hospitalization/screens/NurseHospitalizationDashboardScreen';
import { NurseHospitalizationDetailScreen } from '@/features/nurse/hospitalization/screens/NurseHospitalizationDetailScreen';
import { NurseHospitalizationEventsScreen } from '@/features/nurse/hospitalization/screens/NurseHospitalizationEventsScreen';
import { NurseInpatientVitalSignsFormScreen } from '@/features/nurse/hospitalization/screens/NurseInpatientVitalSignsFormScreen';
import { NurseInpatientVitalSignsHistoryScreen } from '@/features/nurse/hospitalization/screens/NurseInpatientVitalSignsHistoryScreen';
import { NurseInpatientsScreen } from '@/features/nurse/hospitalization/screens/NurseInpatientsScreen';
import { NurseMedicationAdministrationFormScreen } from '@/features/nurse/hospitalization/screens/NurseMedicationAdministrationFormScreen';
import { NurseMedicationAdministrationsScreen } from '@/features/nurse/hospitalization/screens/NurseMedicationAdministrationsScreen';
import { NurseNursingNoteFormScreen } from '@/features/nurse/hospitalization/screens/NurseNursingNoteFormScreen';
import { NurseNursingNotesListScreen } from '@/features/nurse/hospitalization/screens/NurseNursingNotesListScreen';
import { NurseNursingRoundFormScreen } from '@/features/nurse/hospitalization/screens/NurseNursingRoundFormScreen';
import { NurseNursingRoundsScreen } from '@/features/nurse/hospitalization/screens/NurseNursingRoundsScreen';
import { NursePendingMedicationsScreen } from '@/features/nurse/hospitalization/screens/NursePendingMedicationsScreen';
import { NurseNotificationsScreen } from '@/features/nurse/screens/NurseNotificationsScreen';
import { NursePatientDetailScreen } from '@/features/nurse/screens/NursePatientDetailScreen';
import { NursePatientsInTriageScreen } from '@/features/nurse/screens/NursePatientsInTriageScreen';
import { NurseProfileScreen } from '@/features/nurse/screens/NurseProfileScreen';
import { NurseSecurityScreen } from '@/features/nurse/screens/NurseSecurityScreen';
import { NurseShiftSummaryScreen } from '@/features/nurse/screens/NurseShiftSummaryScreen';
import { NurseTriageDetailScreen } from '@/features/nurse/screens/NurseTriageDetailScreen';
import { NurseTriageFormScreen } from '@/features/nurse/screens/NurseTriageFormScreen';
import { NurseTriageQueueScreen } from '@/features/nurse/screens/NurseTriageQueueScreen';
import { NurseVitalSignsFormScreen } from '@/features/nurse/screens/NurseVitalSignsFormScreen';
import { getPendingMedications } from '@/features/nurse/hospitalization/services/nurseHospitalizationService';
import { getNurseDashboard } from '@/features/nurse/services/nurseApi';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

function NurseHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseDashboardScreen} name="NurseDashboard" />
      <Stack.Screen component={NurseShiftSummaryScreen} name="NurseShiftSummary" />
      <Stack.Screen component={NurseHospitalizationDashboardScreen} name="NurseHospitalizationDashboard" />
      <Stack.Screen component={NurseInpatientsScreen} name="NurseInpatients" />
      <Stack.Screen component={NurseHospitalizationDetailScreen} name="NurseHospitalizationDetail" />
      <Stack.Screen component={NurseInpatientVitalSignsFormScreen} name="NurseInpatientVitalSignsForm" />
      <Stack.Screen component={NurseInpatientVitalSignsHistoryScreen} name="NurseInpatientVitalSignsHistory" />
      <Stack.Screen component={NurseNursingNoteFormScreen} name="NurseNursingNoteForm" />
      <Stack.Screen component={NurseNursingNotesListScreen} name="NurseNursingNotesList" />
      <Stack.Screen component={NurseNursingRoundsScreen} name="NurseNursingRounds" />
      <Stack.Screen component={NurseNursingRoundFormScreen} name="NurseNursingRoundForm" />
      <Stack.Screen component={NurseMedicationAdministrationsScreen} name="NurseMedicationAdministrations" />
      <Stack.Screen component={NurseMedicationAdministrationFormScreen} name="NurseMedicationAdministrationForm" />
      <Stack.Screen component={NursePendingMedicationsScreen} name="NursePendingMedications" />
      <Stack.Screen component={NurseHospitalizationEventsScreen} name="NurseHospitalizationEvents" />
      <Stack.Screen component={NurseBedStatusScreen} name="NurseBedStatus" />
      <Stack.Screen component={NurseNotificationsScreen} name="NurseNotifications" />
      <Stack.Screen component={NursePatientDetailScreen} name="NursePatientDetail" />
      <Stack.Screen component={NursePatientsInTriageScreen} name="NursePatientsInTriage" />
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
      <Stack.Screen component={NursePatientsInTriageScreen} name="NursePatientsInTriage" />
      <Stack.Screen component={NursePatientDetailScreen} name="NursePatientDetail" />
      <Stack.Screen component={NurseVitalSignsFormScreen} name="NurseVitalSignsForm" />
      <Stack.Screen component={NurseTriageFormScreen} name="NurseTriageForm" />
      <Stack.Screen component={NurseCompletedTriagesScreen} name="NurseCompletedTriages" />
      <Stack.Screen component={NurseTriageDetailScreen} name="NurseTriageDetail" />
    </Stack.Navigator>
  );
}

function NursePatientsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseHospitalizationDashboardScreen} name="NurseHospitalizationDashboard" />
      <Stack.Screen component={NurseInpatientsScreen} name="NurseInpatients" />
      <Stack.Screen component={NurseHospitalizationDetailScreen} name="NurseHospitalizationDetail" />
      <Stack.Screen component={NurseInpatientVitalSignsFormScreen} name="NurseInpatientVitalSignsForm" />
      <Stack.Screen component={NurseInpatientVitalSignsHistoryScreen} name="NurseInpatientVitalSignsHistory" />
      <Stack.Screen component={NurseNursingNoteFormScreen} name="NurseNursingNoteForm" />
      <Stack.Screen component={NurseNursingNotesListScreen} name="NurseNursingNotesList" />
      <Stack.Screen component={NurseNursingRoundsScreen} name="NurseNursingRounds" />
      <Stack.Screen component={NurseNursingRoundFormScreen} name="NurseNursingRoundForm" />
      <Stack.Screen component={NurseMedicationAdministrationsScreen} name="NurseMedicationAdministrations" />
      <Stack.Screen component={NurseMedicationAdministrationFormScreen} name="NurseMedicationAdministrationForm" />
      <Stack.Screen component={NursePendingMedicationsScreen} name="NursePendingMedications" />
      <Stack.Screen component={NurseHospitalizationEventsScreen} name="NurseHospitalizationEvents" />
      <Stack.Screen component={NurseBedStatusScreen} name="NurseBedStatus" />
    </Stack.Navigator>
  );
}

function NurseNotesStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseInpatientsScreen} initialParams={{ intent: 'note' }} name="NurseInpatients" />
      <Stack.Screen component={NurseHospitalizationDetailScreen} name="NurseHospitalizationDetail" />
      <Stack.Screen component={NurseNursingNoteFormScreen} name="NurseNursingNoteForm" />
      <Stack.Screen component={NurseNursingNotesListScreen} name="NurseNursingNotesList" />
      <Stack.Screen component={NurseNursingRoundsScreen} name="NurseNursingRounds" />
      <Stack.Screen component={NurseNursingRoundFormScreen} name="NurseNursingRoundForm" />
      <Stack.Screen component={NurseMedicationAdministrationsScreen} name="NurseMedicationAdministrations" />
      <Stack.Screen component={NurseMedicationAdministrationFormScreen} name="NurseMedicationAdministrationForm" />
      <Stack.Screen component={NursePendingMedicationsScreen} name="NursePendingMedications" />
      <Stack.Screen component={NurseInpatientVitalSignsFormScreen} name="NurseInpatientVitalSignsForm" />
      <Stack.Screen component={NurseInpatientVitalSignsHistoryScreen} name="NurseInpatientVitalSignsHistory" />
      <Stack.Screen component={NurseHospitalizationEventsScreen} name="NurseHospitalizationEvents" />
    </Stack.Navigator>
  );
}

function NurseProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={NurseProfileScreen} name="NurseProfile" />
      <Stack.Screen component={NurseNotificationsScreen} name="NurseNotifications" />
      <Stack.Screen component={NurseSecurityScreen} name="NurseSecurity" />
      <Stack.Screen component={NurseChangePasswordScreen} name="NurseChangePassword" />
    </Stack.Navigator>
  );
}

export function NurseTabs() {
  const insets = useSafeAreaInsets();
  const [triageBadge, setTriageBadge] = useState<number | undefined>();
  const [medicationBadge, setMedicationBadge] = useState<number | undefined>();

  const loadBadges = useCallback(async () => {
    const [dashboard, medications] = await Promise.all([
      getNurseDashboard().catch(() => null),
      getPendingMedications().catch(() => []),
    ]);
    const triageCount = (dashboard?.waitingCount ?? 0) + (dashboard?.inTriageCount ?? 0);
    setTriageBadge(triageCount > 0 ? triageCount : undefined);
    setMedicationBadge(medications.length > 0 ? medications.length : undefined);
  }, []);

  useEffect(() => {
    void loadBadges();
    const timer = setInterval(() => void loadBadges(), 60000);
    return () => clearInterval(timer);
  }, [loadBadges]);

  return (
    <RoleGuard roles={['enfermera']}>
      <Tab.Navigator screenOptions={createTabOptions(insets)}>
        <Tab.Screen component={NurseHomeStack} name="NurseHomeTab" options={{ tabBarIcon: tabIcon('heart-pulse'), title: 'Inicio' }} />
        <Tab.Screen component={NurseTriageStack} name="NurseTriageTab" options={{ tabBarBadge: triageBadge, tabBarIcon: tabIcon('clipboard-account-outline'), title: 'Triaje' }} />
        <Tab.Screen component={NursePatientsStack} name="NurseHospitalizationTab" options={{ tabBarBadge: medicationBadge, tabBarIcon: tabIcon('hospital-building'), title: 'Internados' }} />
        <Tab.Screen component={NurseNotesStack} name="NurseNotesTab" options={{ tabBarIcon: tabIcon('notebook-outline'), title: 'Notas' }} />
        <Tab.Screen component={NurseProfileStack} name="NurseProfileTab" options={{ tabBarIcon: tabIcon('account-heart-outline'), title: 'Perfil' }} />
      </Tab.Navigator>
    </RoleGuard>
  );
}
