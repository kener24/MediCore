import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { CashierCashSessionScreen } from '@/features/cashier/screens/CashierCashSessionScreen';
import { CashierChangePasswordScreen } from '@/features/cashier/screens/CashierChangePasswordScreen';
import { CashierDashboardScreen } from '@/features/cashier/screens/CashierDashboardScreen';
import { CashierInvoiceDetailScreen } from '@/features/cashier/screens/CashierInvoiceDetailScreen';
import { CashierInvoiceSearchScreen } from '@/features/cashier/screens/CashierInvoiceSearchScreen';
import { CashierPaymentDetailScreen } from '@/features/cashier/screens/CashierPaymentDetailScreen';
import { CashierPaymentsHistoryScreen } from '@/features/cashier/screens/CashierPaymentsHistoryScreen';
import { CashierPendingInvoicesScreen } from '@/features/cashier/screens/CashierPendingInvoicesScreen';
import { CashierProfileScreen } from '@/features/cashier/screens/CashierProfileScreen';
import { CashierRegisterPaymentScreen } from '@/features/cashier/screens/CashierRegisterPaymentScreen';
import { CashierSecurityScreen } from '@/features/cashier/screens/CashierSecurityScreen';
import { createTabOptions, tabIcon } from '@/navigation/tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false };

export function CashierHomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={CashierDashboardScreen} name="CashierDashboard" />
      <Stack.Screen component={CashierCashSessionScreen} name="CashierCashSession" />
      <Stack.Screen component={CashierPendingInvoicesScreen} name="CashierPendingInvoices" />
      <Stack.Screen component={CashierInvoiceSearchScreen} name="CashierInvoiceSearch" />
      <Stack.Screen component={CashierInvoiceDetailScreen} name="CashierInvoiceDetail" />
      <Stack.Screen component={CashierRegisterPaymentScreen} name="CashierRegisterPayment" />
      <Stack.Screen component={CashierPaymentDetailScreen} name="CashierPaymentDetail" />
      <Stack.Screen component={CashierPaymentsHistoryScreen} name="CashierPaymentsHistory" />
      <Stack.Screen component={CashierProfileScreen} name="CashierProfile" />
      <Stack.Screen component={CashierSecurityScreen} name="CashierSecurity" />
      <Stack.Screen component={CashierChangePasswordScreen} name="CashierChangePassword" />
    </Stack.Navigator>
  );
}

function CashierPendingStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={CashierPendingInvoicesScreen} name="CashierPendingInvoices" />
      <Stack.Screen component={CashierCashSessionScreen} name="CashierCashSession" />
      <Stack.Screen component={CashierInvoiceDetailScreen} name="CashierInvoiceDetail" />
      <Stack.Screen component={CashierRegisterPaymentScreen} name="CashierRegisterPayment" />
      <Stack.Screen component={CashierPaymentDetailScreen} name="CashierPaymentDetail" />
    </Stack.Navigator>
  );
}

function CashierSearchStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={CashierInvoiceSearchScreen} name="CashierInvoiceSearch" />
      <Stack.Screen component={CashierCashSessionScreen} name="CashierCashSession" />
      <Stack.Screen component={CashierInvoiceDetailScreen} name="CashierInvoiceDetail" />
      <Stack.Screen component={CashierRegisterPaymentScreen} name="CashierRegisterPayment" />
      <Stack.Screen component={CashierPaymentDetailScreen} name="CashierPaymentDetail" />
    </Stack.Navigator>
  );
}

function CashierPaymentsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={CashierPaymentsHistoryScreen} name="CashierPaymentsHistory" />
      <Stack.Screen component={CashierCashSessionScreen} name="CashierCashSession" />
      <Stack.Screen component={CashierPaymentDetailScreen} name="CashierPaymentDetail" />
      <Stack.Screen component={CashierInvoiceDetailScreen} name="CashierInvoiceDetail" />
    </Stack.Navigator>
  );
}

function CashierProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen component={CashierProfileScreen} name="CashierProfile" />
      <Stack.Screen component={CashierSecurityScreen} name="CashierSecurity" />
      <Stack.Screen component={CashierChangePasswordScreen} name="CashierChangePassword" />
    </Stack.Navigator>
  );
}

export function CashierTabs() {
  const insets = useSafeAreaInsets();
  return (
    <RoleGuard roles={['cajero', 'recepcionista']}>
      <Tab.Navigator screenOptions={createTabOptions(insets)}>
        <Tab.Screen component={CashierHomeStack} name="CashierHomeTab" options={{ tabBarIcon: tabIcon('cash-register'), title: 'Inicio' }} />
        <Tab.Screen component={CashierPendingStack} name="CashierPendingTab" options={{ tabBarIcon: tabIcon('file-clock-outline'), title: 'Pendientes' }} />
        <Tab.Screen component={CashierSearchStack} name="CashierSearchTab" options={{ tabBarIcon: tabIcon('file-search-outline'), title: 'Buscar' }} />
        <Tab.Screen component={CashierPaymentsStack} name="CashierPaymentsTab" options={{ tabBarIcon: tabIcon('cash-check'), title: 'Pagos' }} />
        <Tab.Screen component={CashierProfileStack} name="CashierProfileTab" options={{ tabBarIcon: tabIcon('account-cog-outline'), title: 'Perfil' }} />
      </Tab.Navigator>
    </RoleGuard>
  );
}
