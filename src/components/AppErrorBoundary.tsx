import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  componentStack: string;
  error: Error | null;
  errorId: string;
  retryCount: number;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { componentStack: '', error: null, errorId: '', retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      error,
      errorId: `ERR-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' });
    console.warn('AppErrorBoundary captured an error', error.message, info.componentStack);
  }

  reset = () => {
    this.setState((current) => ({
      componentStack: '',
      error: null,
      errorId: '',
      retryCount: current.retryCount + 1,
    }));
  };

  render() {
    if (!this.state.error) return this.props.children;

    const showDeveloperDetails = typeof __DEV__ !== 'undefined' && __DEV__;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconShell}>
            <MaterialCommunityIcons color={colors.primary} name="shield-alert-outline" size={36} />
          </View>
          <Text style={styles.kicker}>MediCore</Text>
          <Text style={styles.title}>Algo no se cargó correctamente</Text>
          <Text style={styles.message}>
            La app se recuperó de un error inesperado. Puedes intentar cargar la pantalla otra vez; si vuelve a pasar, cierra sesión y entra nuevamente.
          </Text>

          <View style={styles.actions}>
            <AppButton label="Reintentar" onPress={this.reset} />
          </View>

          <View style={styles.supportBox}>
            <Text style={styles.supportTitle}>Código de soporte</Text>
            <Text selectable style={styles.supportCode}>{this.state.errorId}</Text>
          </View>

          {showDeveloperDetails ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugTitle}>Detalle técnico</Text>
              <Text selectable style={styles.debugText}>{this.state.error.name}: {this.state.error.message}</Text>
              {this.state.componentStack ? <Text selectable style={styles.debugStack}>{this.state.componentStack}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 4,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  debugBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 14,
    padding: 14,
  },
  debugStack: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  debugText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  debugTitle: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 18,
    height: 68,
    justifyContent: 'center',
    marginBottom: 18,
    width: 68,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  supportBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginTop: 14,
    padding: 14,
  },
  supportCode: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  supportTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 10,
  },
});
