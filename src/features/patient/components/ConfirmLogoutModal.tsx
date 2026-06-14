import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';

export function ConfirmLogoutModal({
  onCancel,
  onConfirm,
  visible,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <Pressable onPress={onCancel} style={styles.overlay}>
        <Pressable style={styles.modal}>
          <Text style={styles.title}>Cerrar sesion</Text>
          <Text style={styles.message}>Deseas cerrar sesion?</Text>
          <View style={styles.actions}>
            <AppButton label="Cancelar" onPress={onCancel} variant="secondary" />
            <AppButton label="Cerrar sesion" onPress={onConfirm} variant="danger" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    width: '86%',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
});
