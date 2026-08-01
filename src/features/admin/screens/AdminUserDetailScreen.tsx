import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/core/theme/colors';
import {
  adminUserName,
  adminUserRole,
  findAdminDoctorProfileForUser,
  getAdminAccountLocks,
  getAdminUser,
  requestAdminPasswordReset,
  revokeAdminUserSessions,
  setAdminUserActive,
  unlockAdminAccountLock,
} from '@/features/admin/services/adminService';
import type { AdminAccountLock, AdminDoctorProfile, AdminUser } from '@/features/admin/types/admin.types';
import { formatCurrency, formatDateTime } from '@/features/cashier/types/commonCashier.types';
import { getManagedSessions, revokeManagedSession, type ManagedSession } from '@/features/security/services/sessionService';

type RouteParams = { userId?: number | string };
type StatusModal = { active: boolean; user: AdminUser } | null;
type SessionModal = { session?: ManagedSession; all?: boolean } | null;

export function AdminUserDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { userId } = (route.params ?? {}) as RouteParams;
  const [user, setUser] = useState<AdminUser | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<AdminDoctorProfile | null>(null);
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [locks, setLocks] = useState<AdminAccountLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusModal, setStatusModal] = useState<StatusModal>(null);
  const [statusReason, setStatusReason] = useState('');
  const [sessionModal, setSessionModal] = useState<SessionModal>(null);
  const [sessionReason, setSessionReason] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!userId) {
      setError('No se recibió el usuario a consultar.');
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const nextUser = await getAdminUser(userId);
      const [nextSessions, nextLocks, nextDoctorProfile] = await Promise.all([
        getManagedSessions({ active: true, user: nextUser.id }).catch(() => []),
        getAdminAccountLocks({ active: true, user: nextUser.id }).catch(() => []),
        String(adminUserRole(nextUser)).toLowerCase().includes('medico') ? findAdminDoctorProfileForUser(nextUser).catch(() => null) : Promise.resolve(null),
      ]);
      setUser(nextUser);
      setSessions(nextSessions);
      setLocks(nextLocks);
      setDoctorProfile(nextDoctorProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle del usuario.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openStatusModal = (active: boolean) => {
    if (!user) return;
    setStatusReason('');
    setStatusModal({ active, user });
  };

  const confirmStatusChange = async () => {
    if (!statusModal || saving) return;
    const reason = statusReason.trim();
    if (reason.length < 8) {
      Alert.alert('Motivo requerido', 'Escribe un motivo claro de al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await setAdminUserActive(statusModal.user.id, statusModal.active, reason);
      setStatusModal(null);
      await load(true);
    } catch (err) {
      Alert.alert('Equipo', err instanceof Error ? err.message : 'No se pudo cambiar el estado del usuario.');
    } finally {
      setSaving(false);
    }
  };

  const openSessionModal = (session?: ManagedSession, all = false) => {
    setSessionReason('');
    setSessionModal({ session, all });
  };

  const confirmRevoke = async () => {
    if (!sessionModal || !user || saving) return;
    const reason = sessionReason.trim();
    if (reason.length < 5) {
      Alert.alert('Motivo requerido', 'Escribe un motivo de al menos 5 caracteres.');
      return;
    }
    setSaving(true);
    try {
      if (sessionModal.all) await revokeAdminUserSessions(user.id, reason);
      else if (sessionModal.session) await revokeManagedSession(sessionModal.session.id, reason);
      setSessionModal(null);
      await load(true);
    } catch (err) {
      Alert.alert('Sesiones', err instanceof Error ? err.message : 'No se pudo cerrar la sesión.');
    } finally { setSaving(false); }
  };

  const confirmUnlock = (lock: AdminAccountLock) => {
    Alert.alert('Desbloquear cuenta', `Se retirará el bloqueo de ${lock.user_email ?? user?.email ?? 'este usuario'}.`, [
      { style: 'cancel', text: 'Cancelar' },
      {
        onPress: () => void unlockAdminAccountLock(lock.id)
          .then(() => load(true))
          .catch((err) => Alert.alert('Bloqueos', err instanceof Error ? err.message : 'No se pudo desbloquear la cuenta.')),
        text: 'Desbloquear',
      },
    ]);
  };

  const confirmPasswordRecovery = () => {
    if (!user) return;
    Alert.alert('Recuperar contraseña', `Se enviará el flujo de recuperación a ${user.email}.`, [
      { style: 'cancel', text: 'Cancelar' },
      {
        onPress: () => void requestAdminPasswordReset(user.id)
          .then(() => Alert.alert('Recuperación', 'Solicitud enviada correctamente.'))
          .catch((err) => Alert.alert('Recuperación', err instanceof Error ? err.message : 'No se pudo iniciar la recuperación.')),
        text: 'Enviar',
      },
    ]);
  };

  if (loading) return <LoadingState label="Cargando usuario..." />;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />}>
          <AppHeader icon="account-details-outline" subtitle="Estado, permisos, sesiones y seguridad." title="Detalle de usuario" />
          {error ? <ErrorState message={error} onRetry={() => void load()} title="Usuario no disponible" /> : null}
          <AppButton label="Volver al equipo" onPress={() => navigation.goBack()} variant="secondary" />

          {user ? (
            <>
              <AppCard style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{adminUserName(user).slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{adminUserName(user)}</Text>
                    <Text style={styles.meta}>{user.email}</Text>
                    <Text style={styles.meta}>Rol: {adminUserRole(user)}</Text>
                  </View>
                  <Text style={[styles.status, user.is_active === false && styles.statusOff]}>{user.is_active === false ? 'Inactivo' : 'Activo'}</Text>
                </View>
                <Info label="Teléfono" value={user.telefono ?? user.phone ?? 'Sin teléfono'} />
                <Info label="Correo verificado" value={user.email_verified ? 'Sí' : 'No'} />
                <Info label="Último acceso" value={formatDateTime(user.ultimo_acceso ?? user.last_login)} />
                <Info label="Cambio de contraseña" value={formatDateTime(user.password_changed_at)} />
                <AppButton label="Editar usuario" onPress={() => navigation.navigate('AdminEditUser', { userId: user.id })} />
                <AppButton label="Enviar recuperación de contraseña" onPress={confirmPasswordRecovery} variant="secondary" />
                <AppButton
                  label={user.is_active === false ? 'Activar usuario' : 'Desactivar usuario'}
                  onPress={() => openStatusModal(user.is_active === false)}
                  variant={user.is_active === false ? 'secondary' : 'danger'}
                />
              </AppCard>

              {doctorProfile ? (
                <AppCard style={styles.card}>
                  <Text style={styles.title}>Perfil médico</Text>
                  <Info label="Especialidad" value={doctorProfile.specialty_nombre ?? String(doctorProfile.specialty ?? 'Sin especialidad')} />
                  <Info label="Colegiación" value={doctorProfile.numero_colegiacion ?? 'Sin dato'} />
                  <Info label="Título" value={doctorProfile.titulo_profesional ?? 'Sin dato'} />
                  <Info label="Duración consulta" value={`${doctorProfile.duracion_consulta_minutos ?? 0} minutos`} />
                  <Info label="Tarifa" value={formatCurrency(doctorProfile.tarifa_consulta ?? 0)} />
                  <Info label="Virtual" value={doctorProfile.atiende_virtual ? 'Sí' : 'No'} />
                  <AppButton label="Gestionar horarios" onPress={() => navigation.navigate('AdminDoctorSchedules', { doctorId: doctorProfile.id, doctorName: adminUserName(user) })} variant="secondary" />
                </AppCard>
              ) : null}

              <AppCard style={styles.card}>
                <Text style={styles.title}>Sesiones activas</Text>
                {sessions.length > 1 ? <AppButton label="Cerrar todas las sesiones" onPress={() => openSessionModal(undefined, true)} variant="danger" /> : null}
                {sessions.length === 0 ? <EmptyState description="Este usuario no tiene sesiones activas." title="Sin sesiones" /> : null}
                {sessions.map((session) => (
                  <View key={session.id} style={styles.itemBox}>
                    <Text style={styles.itemTitle}>{session.device_name || 'Dispositivo'}</Text>
                    <Text style={styles.meta}>{session.platform || 'Plataforma no identificada'} · {session.location_hint || 'Ubicación protegida'}</Text>
                    <Text style={styles.meta}>Actividad: {formatDateTime(session.last_activity_at)}</Text>
                    <AppButton disabled={session.current} label={session.current ? 'Sesión actual' : 'Cerrar sesión'} onPress={() => openSessionModal(session)} variant="danger" />
                  </View>
                ))}
              </AppCard>

              <AppCard style={styles.card}>
                <Text style={styles.title}>Bloqueos de cuenta</Text>
                {locks.length === 0 ? <EmptyState description="No hay bloqueos activos para este usuario." title="Sin bloqueos" /> : null}
                {locks.map((lock) => (
                  <View key={lock.id} style={styles.itemBox}>
                    <Text style={styles.itemTitle}>{lock.reason || 'Bloqueo por intentos fallidos'}</Text>
                    <Text style={styles.meta}>Intentos: {lock.failed_attempts ?? 0} · Hasta: {formatDateTime(lock.locked_until)}</Text>
                    <AppButton label="Desbloquear cuenta" onPress={() => confirmUnlock(lock)} variant="secondary" />
                  </View>
                ))}
              </AppCard>
            </>
          ) : null}
        </ScrollView>

        <Modal animationType="fade" transparent visible={Boolean(statusModal)}>
          <View style={styles.modalBackdrop}>
            <AppCard style={styles.modalCard}>
              <Text style={styles.title}>{statusModal?.active ? 'Activar usuario' : 'Desactivar usuario'}</Text>
              <Text style={styles.meta}>El motivo quedará asociado a la acción administrativa para trazabilidad.</Text>
              <AppInput
                label="Motivo"
                multiline
                onChangeText={setStatusReason}
                placeholder="Ej. Fin de contrato, reingreso autorizado..."
                value={statusReason}
              />
              <View style={styles.modalActions}>
                <AppButton disabled={saving} label="Cancelar" onPress={() => setStatusModal(null)} variant="secondary" />
                <AppButton loading={saving} label="Confirmar" onPress={confirmStatusChange} variant={statusModal?.active ? 'primary' : 'danger'} />
              </View>
            </AppCard>
          </View>
        </Modal>
        <Modal animationType="fade" transparent visible={Boolean(sessionModal)}>
          <View style={styles.modalBackdrop}>
            <AppCard style={styles.modalCard}>
              <Text style={styles.title}>{sessionModal?.all ? 'Cerrar todas las sesiones' : 'Cerrar sesión'}</Text>
              <Text style={styles.meta}>El usuario deberá iniciar sesión nuevamente. El motivo quedará auditado.</Text>
              <AppInput label="Motivo" multiline onChangeText={setSessionReason} placeholder="Ej. Equipo extraviado o cambio de funciones" value={sessionReason} />
              <View style={styles.modalActions}>
                <AppButton disabled={saving} label="Cancelar" onPress={() => setSessionModal(null)} variant="secondary" />
                <AppButton loading={saving} label="Cerrar sesión" onPress={confirmRevoke} variant="danger" />
              </View>
            </AppCard>
          </View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: '900',
  },
  card: {
    gap: 12,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 130,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  infoRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 10,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  itemBox: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  modalActions: {
    gap: 10,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  modalCard: {
    gap: 14,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  status: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    color: colors.success,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusOff: {
    backgroundColor: '#fee2e2',
    color: colors.danger,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});
