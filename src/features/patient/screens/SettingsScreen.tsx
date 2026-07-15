import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { disablePushDevice, getNotificationPreferences, registerDeviceForPushNotifications, updateNotificationPreferences, type NotificationPreferences } from '@/core/notifications/pushNotificationService';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ConfirmLogoutModal } from '@/features/patient/components/ConfirmLogoutModal';
import { PatientHeader } from '@/features/patient/components/PatientHeader';
import { SettingsOption } from '@/features/patient/components/SettingsOption';
import { getPatientPortalSettings } from '@/features/patient/services/patientPortalSettingsService';
import type { PatientPortalSettings } from '@/features/patient/types/patientPortalSettings.types';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const [settings, setSettings] = useState<PatientPortalSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [nextSettings, nextPreferences] = await Promise.all([
        getPatientPortalSettings(),
        getNotificationPreferences().catch(() => null),
      ]);
      setSettings(nextSettings);
      setNotificationPreferences(nextPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function confirmLogout() {
    setLogoutVisible(false);
    await signOut();
  }

  async function togglePushNotifications() {
    setPushLoading(true);
    try {
      if (notificationPreferences?.push_enabled) {
        await disablePushDevice();
        const updated = await updateNotificationPreferences({ push_enabled: false });
        setNotificationPreferences(updated);
        Alert.alert('Notificaciones', 'Las notificaciones push quedaron desactivadas para esta cuenta.');
      } else {
        const result = await registerDeviceForPushNotifications();
        const updated = await getNotificationPreferences();
        setNotificationPreferences(updated);
        Alert.alert('Notificaciones', result.registered ? 'Notificaciones push activadas correctamente.' : result.reason);
      }
    } catch (err) {
      Alert.alert('Notificaciones', err instanceof Error ? err.message : 'No se pudo actualizar la preferencia.');
    } finally {
      setPushLoading(false);
    }
  }

  if (loading) return <LoadingState label="Cargando configuración..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <PatientHeader subtitle="Gestiona tu cuenta y preferencias." title="Configuración" />
        {error ? <ErrorState message={error} onRetry={() => void load()} title="No se pudo cargar configuración" /> : null}

        <AppCard style={styles.portalCard}>
          <Text style={styles.sectionTitle}>Portal paciente</Text>
          <PortalFlag enabled={settings?.portal?.allow_online_appointments} label="Citas en línea" />
          <PortalFlag enabled={settings?.portal?.allow_patient_cancellations} label="Cancelación de citas" />
          <PortalFlag enabled={settings?.portal?.allow_patient_medical_record_view} label="Historial clínico" />
          <PortalFlag enabled={settings?.portal?.allow_patient_prescription_view} label="Recetas" />
          <PortalFlag enabled={settings?.portal?.allow_patient_invoice_view} label="Facturas y pagos" />
          <Text style={styles.meta}>
            Cancelación permitida hasta {settings?.portal?.cancellation_hours_limit ?? 0} horas antes.
          </Text>
          <Text style={styles.meta}>Moneda: {settings?.portal?.currency || 'HNL'}</Text>
        </AppCard>

        <AppCard style={styles.portalCard}>
          <Text style={styles.sectionTitle}>Avisos importantes</Text>
          <View style={styles.flagRow}>
            <View style={styles.flagCopy}>
              <Text style={styles.flagLabel}>Notificaciones push</Text>
              <Text style={styles.meta}>Recibe avisos de citas, pagos, recetas y mensajes importantes.</Text>
            </View>
            <StatusBadge label={notificationPreferences?.push_enabled ? 'Activas' : 'Inactivas'} status={notificationPreferences?.push_enabled ? 'completed' : 'cancelled'} />
          </View>
          <AppButton
            label={notificationPreferences?.push_enabled ? 'Desactivar push' : 'Activar push'}
            loading={pushLoading}
            onPress={togglePushNotifications}
            variant={notificationPreferences?.push_enabled ? 'secondary' : 'primary'}
          />
        </AppCard>

        <AppCard style={styles.options}>
          <SettingsOption
            icon="account-circle-outline"
            onPress={() => navigation.navigate('PatientProfile')}
            subtitle="Consulta tus datos personales"
            title="Mi perfil"
          />
          <SettingsOption
            icon="lock-reset"
            onPress={() => navigation.navigate('ChangePassword')}
            subtitle="Actualiza tu contraseña"
            title="Cambiar contraseña"
          />
          <SettingsOption
            icon="hospital-building"
            onPress={() => navigation.navigate('ClinicInfo')}
            subtitle="Teléfono, correo y horarios"
            title="Información de clínica"
          />
          <SettingsOption
            icon="bell-outline"
            onPress={() => navigation.navigate('PatientNotifications')}
            subtitle="Avisos y mensajes del portal"
            title="Notificaciones"
          />
          <SettingsOption
            danger
            icon="logout"
            onPress={() => setLogoutVisible(true)}
            subtitle="Finaliza tu sesión en este dispositivo"
            title="Cerrar sesión"
          />
        </AppCard>
      </ScrollView>
      <ConfirmLogoutModal
        onCancel={() => setLogoutVisible(false)}
        onConfirm={confirmLogout}
        visible={logoutVisible}
      />
    </SafeAreaView>
  );
}

function PortalFlag({ enabled, label }: { enabled?: boolean; label: string }) {
  return (
    <View style={styles.flagRow}>
      <Text style={styles.flagLabel}>{label}</Text>
      <StatusBadge label={enabled ? 'Habilitado' : 'No habilitado'} status={enabled ? 'completed' : 'cancelled'} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 22, paddingBottom: 34 },
  flagCopy: { flex: 1, gap: 3 },
  flagLabel: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '800' },
  flagRow: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  options: { gap: 0, paddingVertical: 4 },
  portalCard: { gap: 12 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
});
