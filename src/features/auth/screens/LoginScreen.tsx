import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { ApiClientError } from '@/core/api/authInterceptor';
import { es } from '@/core/i18n/es';
import { colors } from '@/core/theme/colors';
import { useAuth } from '@/features/auth/context/AuthContext';

export function LoginScreen() {
  const { signIn } = useAuth();
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
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo iniciar sesión. Revisa tu conexión.';
      setError(message);
      Alert.alert('Inicio de sesión', message);
    } finally {
      setSubmitting(false);
    }
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
              <MaterialCommunityIcons color={colors.white} name="heart-pulse" size={34} />
            </View>
            <Text style={styles.brand}>MediCore</Text>
            <Text style={styles.subtitle}>Portal móvil seguro</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Bienvenido</Text>
              <Text style={styles.description}>
                Accede a la información autorizada según tu rol dentro de MediCore.
              </Text>
            </View>

            <View style={styles.form}>
              <AppInput
                autoCapitalize="none"
                autoComplete="email"
                icon="email-outline"
                keyboardType="email-address"
                label={es.auth.email}
                onChangeText={setEmail}
                placeholder="usuario@correo.com"
                textContentType="emailAddress"
                value={email}
              />

              <View style={styles.passwordRow}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.passwordLabel}>{es.auth.password}</Text>
                  <Pressable hitSlop={10}>
                    <Text style={styles.textLink}>{es.auth.forgotPassword}</Text>
                  </Pressable>
                </View>
                <AppInput
                  autoCapitalize="none"
                  icon="lock-outline"
                  label=""
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                  placeholder="Ingresa tu contraseña"
                  rightIcon={securePassword ? 'eye-outline' : 'eye-off-outline'}
                  onPressRightIcon={() => setSecurePassword((current) => !current)}
                  secureTextEntry={securePassword}
                  textContentType="password"
                  value={password}
                />
              </View>
            </View>

            <AppButton disabled={!canSubmit} label="Entrar" loading={submitting} onPress={handleLogin} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.securityBox}>
              <View style={styles.securityIcon}>
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="shield-check-outline"
                  size={22}
                />
              </View>
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>Acceso protegido</Text>
                <Text style={styles.securityDescription}>
                  Tokens JWT guardados en SecureStore y menús filtrados por rol.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 26,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 6,
  },
  cardHeader: {
    marginBottom: 22,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 18,
  },
  keyboard: {
    flex: 1,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 70,
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    width: 70,
    elevation: 8,
  },
  passwordLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  passwordLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passwordRow: {
    gap: 8,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  securityBox: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderColor: '#ccebe7',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    padding: 14,
  },
  securityDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  securityIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 6,
  },
  textLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
