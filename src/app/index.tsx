import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

const accent = '#0f8f85';
const ink = '#102033';
const muted = '#667085';
const panel = '#ffffff';
const page = '#eef5f7';

export default function LoginScreen() {
  const { loading, role, signIn, signOut, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !submitting;

  async function handleLogin() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await signIn({ email: email.trim().toLowerCase(), password });
      setPassword('');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo iniciar sesion. Revisa tu conexion.';
      setError(message);
      Alert.alert('Inicio de sesion', message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <View style={styles.logoMark}>
          <MaterialCommunityIcons color="#ffffff" name="heart-pulse" size={34} />
        </View>
        <ActivityIndicator color={accent} size="large" />
        <Text style={styles.loadingText}>Preparando MediCore...</Text>
      </SafeAreaView>
    );
  }

  if (user) {
    return <RoleHome role={role} signOut={signOut} user={user} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandArea}>
            <View style={styles.logoMark}>
              <MaterialCommunityIcons color="#ffffff" name="heart-pulse" size={34} />
            </View>
            <Text style={styles.brand}>MediCore</Text>
            <Text style={styles.subtitle}>Portal seguro para pacientes</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Bienvenido</Text>
              <Text style={styles.description}>
                Accede a tus citas, expediente, pagos y notificaciones desde un solo lugar.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Correo electronico</Text>
              <View style={styles.inputShell}>
                <MaterialCommunityIcons color={muted} name="email-outline" size={20} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="paciente@correo.com"
                  placeholderTextColor="#98a2b3"
                  style={styles.input}
                  value={email}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Contrasena</Text>
                <Pressable hitSlop={10}>
                  <Text style={styles.textLink}>Olvide mi contrasena</Text>
                </Pressable>
              </View>
              <View style={styles.inputShell}>
                <MaterialCommunityIcons color={muted} name="lock-outline" size={20} />
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setPassword}
                  placeholder="Ingresa tu contrasena"
                  placeholderTextColor="#98a2b3"
                  secureTextEntry={securePassword}
                  style={styles.input}
                  value={password}
                />
                <Pressable hitSlop={10} onPress={() => setSecurePassword((current) => !current)}>
                  <MaterialCommunityIcons
                    color={muted}
                    name={securePassword ? 'eye-outline' : 'eye-off-outline'}
                    size={21}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              disabled={!canSubmit}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSubmit && styles.primaryButtonDisabled,
                pressed && canSubmit && styles.primaryButtonPressed,
              ]}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Entrar</Text>
                  <MaterialCommunityIcons color="#ffffff" name="arrow-right" size={20} />
                </>
              )}
            </Pressable>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>MediCore Pacientes</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.securityBox}>
              <View style={styles.securityIcon}>
                <MaterialCommunityIcons color={accent} name="shield-check-outline" size={22} />
              </View>
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>Acceso protegido</Text>
                <Text style={styles.securityDescription}>
                  Tus datos clinicos se consultan mediante APIs seguras del sistema MediCore.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>No tienes acceso?</Text>
            <Pressable hitSlop={10}>
              <Text style={styles.footerLink}>Solicitalo en tu clinica</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleHome({
  role,
  signOut,
  user,
}: {
  role: string | null;
  signOut: () => Promise<void>;
  user: {
    nombre_completo: string;
    email: string;
    clinica_nombre?: string;
  };
}) {
  const isPatient = role === 'paciente';
  const title = isPatient ? 'Mi salud' : 'Panel movil';
  const description = isPatient
    ? 'Tu portal de paciente esta listo para conectarse con citas, expediente, facturas y notificaciones.'
    : 'Esta misma app mostrara funciones diferentes segun tu rol. Primero completaremos paciente y luego activaremos vistas profesionales.';

  const items = isPatient
    ? [
        { icon: 'calendar-check-outline', label: 'Mis citas', detail: 'Proximas consultas y solicitudes' },
        { icon: 'file-document-heart-outline', label: 'Expediente', detail: 'Resumen clinico y documentos' },
        { icon: 'receipt-text-outline', label: 'Facturacion', detail: 'Facturas, pagos y saldos' },
        { icon: 'bell-outline', label: 'Notificaciones', detail: 'Avisos de tu clinica' },
      ]
    : [
        { icon: 'account-badge-outline', label: 'Rol detectado', detail: role ?? 'Sin rol' },
        { icon: 'shield-account-outline', label: 'Acceso por permisos', detail: 'Menus filtrados por rol' },
        { icon: 'cellphone-cog', label: 'Modulo pendiente', detail: 'Se activara por etapa' },
      ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}>
          <View style={styles.logoMarkSmall}>
            <MaterialCommunityIcons color="#ffffff" name="heart-pulse" size={26} />
          </View>
          <View style={styles.homeHeaderText}>
            <Text style={styles.homeEyebrow}>MediCore</Text>
            <Text style={styles.homeName}>{user.nombre_completo}</Text>
            <Text style={styles.homeMeta}>{user.clinica_nombre || user.email}</Text>
          </View>
        </View>

        <View style={styles.homeHero}>
          <Text style={styles.homeRole}>{role || 'usuario'}</Text>
          <Text style={styles.homeTitle}>{title}</Text>
          <Text style={styles.homeDescription}>{description}</Text>
        </View>

        <View style={styles.homeGrid}>
          {items.map((item) => (
            <View key={item.label} style={styles.homeCard}>
              <View style={styles.homeCardIcon}>
                <MaterialCommunityIcons color={accent} name={item.icon as never} size={24} />
              </View>
              <Text style={styles.homeCardTitle}>{item.label}</Text>
              <Text style={styles.homeCardText}>{item.detail}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={signOut} style={styles.signOutButton}>
          <MaterialCommunityIcons color="#b42318" name="logout" size={20} />
          <Text style={styles.signOutText}>Cerrar sesion</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: page,
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: muted,
    fontSize: 15,
    fontWeight: '700',
  },
  safeArea: {
    flex: 1,
    backgroundColor: page,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: accent,
    borderRadius: 22,
    height: 70,
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: accent,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    width: 70,
    elevation: 8,
  },
  brand: {
    color: ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: muted,
    fontSize: 15,
    marginTop: 6,
  },
  card: {
    backgroundColor: panel,
    borderColor: '#d9e4e8',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 6,
  },
  cardHeader: {
    marginBottom: 22,
  },
  title: {
    color: ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  description: {
    color: muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  fieldGroup: {
    gap: 8,
    marginBottom: 16,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: ink,
    fontSize: 14,
    fontWeight: '700',
  },
  textLink: {
    color: accent,
    fontSize: 13,
    fontWeight: '700',
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: '#f8fbfc',
    borderColor: '#d5e0e4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  input: {
    color: ink,
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: accent,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 54,
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9accc7',
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    color: '#b42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginVertical: 22,
  },
  divider: {
    backgroundColor: '#e4ecef',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: '#8792a0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  securityBox: {
    alignItems: 'center',
    backgroundColor: '#eefaf8',
    borderColor: '#ccebe7',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  securityIcon: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    color: ink,
    fontSize: 14,
    fontWeight: '800',
  },
  securityDescription: {
    color: muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    color: muted,
    fontSize: 14,
  },
  footerLink: {
    color: accent,
    fontSize: 14,
    fontWeight: '800',
  },
  homeContent: {
    padding: 22,
    paddingBottom: 34,
  },
  homeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
  },
  logoMarkSmall: {
    alignItems: 'center',
    backgroundColor: accent,
    borderRadius: 18,
    height: 54,
    justifyContent: 'center',
    shadowColor: accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    width: 54,
    elevation: 6,
  },
  homeHeaderText: {
    flex: 1,
  },
  homeEyebrow: {
    color: accent,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  homeName: {
    color: ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  homeMeta: {
    color: muted,
    fontSize: 13,
    marginTop: 3,
  },
  homeHero: {
    backgroundColor: '#102033',
    borderRadius: 24,
    marginBottom: 18,
    overflow: 'hidden',
    padding: 22,
  },
  homeRole: {
    alignSelf: 'flex-start',
    backgroundColor: '#d9f7f3',
    borderRadius: 999,
    color: '#0b615b',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 20,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  homeTitle: {
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
  },
  homeDescription: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  homeGrid: {
    gap: 12,
  },
  homeCard: {
    backgroundColor: panel,
    borderColor: '#d9e4e8',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  homeCardIcon: {
    alignItems: 'center',
    backgroundColor: '#eefaf8',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    marginBottom: 12,
    width: 46,
  },
  homeCardTitle: {
    color: ink,
    fontSize: 16,
    fontWeight: '900',
  },
  homeCardText: {
    color: muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signOutText: {
    color: '#b42318',
    fontSize: 14,
    fontWeight: '900',
  },
});
