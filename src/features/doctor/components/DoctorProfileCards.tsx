import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type {
  ChangePasswordPayload,
  DoctorActivitySummary,
  DoctorClinicInfo,
  DoctorProfessionalInfo,
  DoctorProfile,
  DoctorScheduleItem,
} from '@/features/doctor/types/doctorProfile.types';

export function DoctorProfileHeader({ profile }: { profile: DoctorProfile }) {
  const name = doctorName(profile);
  return (
    <AppCard style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{profile.email || 'Correo no disponible'}</Text>
        <View style={styles.badges}>
          <Text style={styles.roleBadge}>Médico</Text>
          <Text style={[styles.statusBadge, profile.is_active === false && styles.statusInactive]}>
            {profile.is_active === false ? 'Inactivo' : 'Activo'}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}

export function DoctorInfoCard({ profile }: { profile: DoctorProfile }) {
  return (
    <InfoCard
      icon="account-outline"
      items={[
        ['Nombre', doctorName(profile)],
        ['Correo', profile.email],
        ['Teléfono', profile.phone ?? profile.telefono],
        ['Rol', profile.role_nombre ?? roleLabel(profile.role) ?? 'Médico'],
        ['Último inicio de sesión', formatDateTime(profile.last_login)],
      ]}
      title="Información personal"
    />
  );
}

export function DoctorProfessionalInfoCard({ professional, profile }: { professional?: DoctorProfessionalInfo | null; profile: DoctorProfile }) {
  const consultationDuration = professional?.consultation_duration_minutes ?? professional?.duracion_consulta;
  return (
    <InfoCard
      emptyMessage="Información profesional no disponible."
      icon="stethoscope"
      items={[
        ['Especialidad', professional?.specialty ?? professional?.especialidad ?? profile.specialty_name ?? profile.especialidad_nombre],
        ['Subespecialidad', professional?.sub_specialty ?? professional?.subespecialidad],
        ['Número de colegiación', professional?.license_number ?? professional?.professional_code ?? professional?.numero_colegiacion],
        ['Duración promedio', consultationDuration ? `${consultationDuration} min` : undefined],
        ['Tarifa', professional?.consultation_fee ?? professional?.tarifa_consulta],
        ['Biografía', professional?.biography ?? professional?.biografia],
      ]}
      title="Información profesional"
    />
  );
}

export function DoctorClinicInfoCard({ clinic, profile }: { clinic?: DoctorClinicInfo | null; profile: DoctorProfile }) {
  const normalized = normalizeClinic(clinic ?? profile.clinic ?? profile.clinica);
  return (
    <InfoCard
      emptyMessage="No hay clínica asignada."
      icon="hospital-building"
      items={[
        ['Clínica', normalized?.name ?? normalized?.nombre ?? profile.clinic_name ?? profile.clinica_nombre],
        ['Dirección', normalized?.address ?? normalized?.direccion],
        ['Teléfono', normalized?.phone ?? normalized?.telefono],
        ['Correo', normalized?.email ?? normalized?.correo],
      ]}
      title="Clínica asignada"
    />
  );
}

export function DoctorScheduleCard({ schedules }: { schedules: DoctorScheduleItem[] }) {
  return (
    <AppCard style={styles.card}>
      <SectionTitle icon="calendar-clock" title="Horarios de atención" />
      {schedules.length ? schedules.map((item, index) => (
        <View key={item.id ?? index} style={styles.scheduleRow}>
          <View>
            <Text style={styles.scheduleDay}>{item.day_label ?? item.day_of_week ?? item.dia ?? 'Día'}</Text>
            <Text style={styles.scheduleTime}>{item.start_time ?? item.hora_inicio ?? '--:--'} - {item.end_time ?? item.hora_fin ?? '--:--'}</Text>
          </View>
          <Text style={[styles.statusBadge, item.is_active === false && styles.statusInactive]}>
            {item.is_active === false ? 'Inactivo' : 'Activo'}
          </Text>
        </View>
      )) : (
        <Text style={styles.emptyText}>No tienes horarios configurados.</Text>
      )}
      <Text style={styles.hint}>Los horarios son administrados por la clínica.</Text>
    </AppCard>
  );
}

export function DoctorActivitySummaryCard({ summary }: { summary?: DoctorActivitySummary | null }) {
  if (!summary) {
    return (
      <AppCard style={styles.card}>
        <SectionTitle icon="chart-line" title="Actividad básica" />
        <Text style={styles.emptyText}>Resumen de actividad no disponible.</Text>
      </AppCard>
    );
  }
  return (
    <AppCard style={styles.card}>
      <SectionTitle icon="chart-line" title="Actividad básica" />
      <View style={styles.statsGrid}>
        <Stat label="Consultas de hoy" value={summary.today_consultations ?? summary.consultas_hoy ?? 0} />
        <Stat label="Finalizadas" value={summary.completed_consultations ?? summary.consultas_finalizadas ?? 0} />
        <Stat label="Pacientes atendidos" value={summary.patients_attended ?? summary.pacientes_atendidos ?? 0} />
        <Stat label="Recetas emitidas" value={summary.prescriptions_issued ?? summary.recetas_emitidas ?? 0} />
      </View>
    </AppCard>
  );
}

export function DoctorProfileMenu({
  onChangePassword,
  onEdit,
  onLogout,
  onSchedule,
  onSecurity,
}: {
  onChangePassword: () => void;
  onEdit: () => void;
  onLogout: () => void;
  onSchedule: () => void;
  onSecurity: () => void;
}) {
  return (
    <AppCard style={styles.menu}>
      <MenuItem icon="account-edit-outline" label="Editar perfil" onPress={onEdit} />
      <MenuItem icon="calendar-clock" label="Ver horarios" onPress={onSchedule} />
      <MenuItem icon="shield-lock-outline" label="Seguridad" onPress={onSecurity} />
      <MenuItem icon="key-outline" label="Cambiar contraseña" onPress={onChangePassword} />
      <MenuItem danger icon="logout" label="Cerrar sesión" onPress={onLogout} />
    </AppCard>
  );
}

export function ChangePasswordForm({
  loading,
  onChange,
  onSubmit,
  values,
}: {
  loading?: boolean;
  onChange: (field: keyof ChangePasswordPayload, value: string) => void;
  onSubmit: () => void;
  values: ChangePasswordPayload;
}) {
  return (
    <AppCard style={styles.card}>
      <SectionTitle icon="key-outline" title="Cambiar contraseña" />
      <AppInput label="Contraseña actual" onChangeText={(value) => onChange('current_password', value)} secureTextEntry value={values.current_password} />
      <AppInput label="Nueva contraseña" onChangeText={(value) => onChange('new_password', value)} secureTextEntry value={values.new_password} />
      <AppInput label="Confirmar nueva contraseña" onChangeText={(value) => onChange('confirm_password', value)} secureTextEntry value={values.confirm_password} />
      <AppButton disabled={loading} label="Actualizar contraseña" loading={loading} onPress={onSubmit} />
    </AppCard>
  );
}

export function LogoutButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AppButton
      label="Cerrar sesión"
      onPress={() => Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: onConfirm, style: 'destructive', text: 'Cerrar sesión' },
      ])}
      variant="danger"
    />
  );
}

function InfoCard({ emptyMessage, icon, items, title }: { emptyMessage?: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; items: [string, unknown][]; title: string }) {
  const hasData = items.some(([, value]) => hasValue(value));
  return (
    <AppCard style={styles.card}>
      <SectionTitle icon={icon} title={title} />
      {hasData ? items.map(([label, value]) => <Info key={label} label={label} value={value} />) : (
        <Text style={styles.emptyText}>{emptyMessage ?? 'Información no disponible.'}</Text>
      )}
    </AppCard>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <MaterialCommunityIcons color={colors.primary} name={icon} size={20} />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatValue(value)}</Text>
    </View>
  );
}

function MenuItem({ danger, icon, label, onPress }: { danger?: boolean; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <MaterialCommunityIcons color={danger ? colors.danger : colors.primary} name={icon} size={22} />
      <Text style={[styles.menuLabel, danger && styles.menuDanger]}>{label}</Text>
      <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={22} />
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function doctorName(profile?: DoctorProfile | null) {
  return profile?.full_name || profile?.nombre_completo || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Médico';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'MD';
}

function normalizeClinic(value?: DoctorProfile['clinic'] | DoctorProfile['clinica']) {
  return value && typeof value === 'object' ? value : null;
}

function roleLabel(value: DoctorProfile['role']) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.nombre;
  return undefined;
}

function formatValue(value: unknown) {
  if (!hasValue(value)) return 'No disponible';
  return String(value);
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

function formatDateTime(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  card: { gap: 12 },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  email: { color: colors.muted, fontSize: 13, marginTop: 3 },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  headerCopy: { flex: 1 },
  hint: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  infoRow: { gap: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  menu: { padding: 0 },
  menuDanger: { color: colors.danger },
  menuItem: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 56, paddingHorizontal: 16 },
  menuLabel: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '800' },
  name: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  roleBadge: { backgroundColor: colors.palePrimary, borderRadius: 999, color: colors.primaryDark, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, textTransform: 'uppercase' },
  scheduleDay: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  scheduleRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10 },
  scheduleTime: { color: colors.muted, fontSize: 13, marginTop: 2 },
  sectionTitle: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  stat: { backgroundColor: colors.surfaceMuted, borderRadius: 14, flexBasis: '47%', flexGrow: 1, padding: 12 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  statusBadge: { backgroundColor: '#DCFCE7', borderRadius: 999, color: colors.success, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, textTransform: 'uppercase' },
  statusInactive: { backgroundColor: '#FEF2F2', color: colors.danger },
  value: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
