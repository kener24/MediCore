import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/core/theme/colors';

type ErrorTone = 'danger' | 'permission' | 'warning';

export function ErrorState({
  message,
  onRetry,
  status,
  title,
  tone,
}: {
  message?: string;
  onRetry?: () => void;
  status?: number;
  title?: string;
  tone?: ErrorTone;
}) {
  const viewModel = resolveErrorView({ message, status, title, tone });

  return (
    <View style={[styles.container, styles[`${viewModel.tone}Container`]]}>
      <View style={[styles.iconShell, styles[`${viewModel.tone}IconShell`]]}>
        <MaterialCommunityIcons color={viewModel.color} name={viewModel.icon} size={30} />
      </View>
      <Text style={[styles.title, { color: viewModel.color }]}>{viewModel.title}</Text>
      {viewModel.message ? <Text style={styles.message}>{viewModel.message}</Text> : null}
      {onRetry ? (
        <Pressable onPress={onRetry} style={[styles.retryButton, { backgroundColor: viewModel.color }]}>
          <Text style={styles.retryText}>{viewModel.retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function resolveErrorView({
  message,
  status,
  title,
  tone,
}: {
  message?: string;
  status?: number;
  title?: string;
  tone?: ErrorTone;
}) {
  if (status === 401 || status === 403 || tone === 'permission') {
    return {
      color: colors.warning,
      icon: 'shield-lock-outline' as const,
      message: message || 'Tu usuario no tiene permisos para abrir esta sección.',
      retryLabel: 'Reintentar',
      title: title || 'Acceso restringido',
      tone: 'permission' as const,
    };
  }

  if (status === 404) {
    return {
      color: colors.warning,
      icon: 'file-search-outline' as const,
      message: message || 'No encontramos la información solicitada.',
      retryLabel: 'Buscar otra vez',
      title: title || 'No encontrado',
      tone: 'warning' as const,
    };
  }

  if (status && status >= 500) {
    return {
      color: colors.danger,
      icon: 'server-network-off' as const,
      message: message || 'El servidor no respondió correctamente. Intenta nuevamente.',
      retryLabel: 'Reintentar',
      title: title || 'Servidor no disponible',
      tone: 'danger' as const,
    };
  }

  return {
    color: tone === 'warning' ? colors.warning : colors.danger,
    icon: tone === 'warning' ? 'alert-outline' as const : 'alert-circle-outline' as const,
    message,
    retryLabel: 'Reintentar',
    title: title || 'Ocurrió un problema',
    tone: tone ?? 'danger' as const,
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
  },
  dangerContainer: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FFD0D0',
  },
  dangerIconShell: {
    backgroundColor: '#FEE2E2',
  },
  iconShell: {
    alignItems: 'center',
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  permissionContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  permissionIconShell: {
    backgroundColor: '#FEF3C7',
  },
  retryButton: {
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  warningIconShell: {
    backgroundColor: '#FEF3C7',
  },
});
