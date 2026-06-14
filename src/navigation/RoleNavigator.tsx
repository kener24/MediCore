import { useAuth } from '@/features/auth/context/AuthContext';
import { UnsupportedRoleScreen } from '@/features/auth/screens/UnsupportedRoleScreen';
import { AdminTabs } from '@/navigation/AdminTabs';
import { DoctorTabs } from '@/navigation/DoctorTabs';
import { NurseTabs } from '@/navigation/NurseTabs';
import { PatientTabs } from '@/navigation/PatientTabs';
import { ReceptionTabs } from '@/navigation/ReceptionTabs';

export function RoleNavigator() {
  const { appRole } = useAuth();

  switch (appRole) {
    case 'paciente':
      return <PatientTabs />;
    case 'medico':
      return <DoctorTabs />;
    case 'recepcionista':
      return <ReceptionTabs />;
    case 'enfermera':
      return <NurseTabs />;
    case 'admin':
      return <AdminTabs />;
    default:
      return <UnsupportedRoleScreen />;
  }
}
