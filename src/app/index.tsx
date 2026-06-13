import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
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

const accent = '#0f8f85';
const ink = '#102033';
const muted = '#667085';
const panel = '#ffffff';
const page = '#eef5f7';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  function handleLogin() {
    // Tomorrow this will call /api/auth/login/ and store the JWT session.
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
              <Text style={styles.primaryButtonText}>Entrar</Text>
              <MaterialCommunityIcons color="#ffffff" name="arrow-right" size={20} />
            </Pressable>

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

const styles = StyleSheet.create({
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
});
