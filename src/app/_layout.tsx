import { Stack } from 'expo-router';

import { AuthProvider } from '@/features/auth/context/AuthContext';

export default function TabLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </AuthProvider>
  );
}
