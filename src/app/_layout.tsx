import { Stack } from 'expo-router';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { AuthProvider } from '@/features/auth/context/AuthContext';

export default function TabLayout() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
