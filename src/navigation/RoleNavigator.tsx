import { useAuth } from '@/features/auth/context/AuthContext';
import { UnsupportedRoleScreen } from '@/features/auth/screens/UnsupportedRoleScreen';
import { AdminTabs } from '@/navigation/AdminTabs';
import { CashierTabs } from '@/navigation/CashierTabs';
import { DoctorTabs } from '@/navigation/DoctorTabs';
import { NurseTabs } from '@/navigation/NurseTabs';
import { PatientTabs } from '@/navigation/PatientTabs';
import { ReceptionTabs } from '@/navigation/ReceptionTabs';
import { SuperAdminTabs } from '@/navigation/SuperAdminTabs';

export function RoleNavigator() {
  const { appRole } = useAuth();

  switch (appRole) {
    case 'paciente':
      return <PatientTabs />;
    case 'medico':
      return <DoctorTabs />;
    case 'recepcionista':
      return <ReceptionTabs />;
    case 'cajero':
      return <CashierTabs />;
    case 'enfermera':
      return <NurseTabs />;
    case 'admin':
      return <AdminTabs />;
    case 'superadmin':
      return <SuperAdminTabs />;
    default:
      return <UnsupportedRoleScreen />;
  }
}
