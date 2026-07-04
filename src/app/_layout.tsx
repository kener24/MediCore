import { Stack } from 'expo-router';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AuthProvider } from '@/features/auth/context/AuthContext';

export default function TabLayout() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
