import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/core/theme/colors';

export function CancelAppointmentModal({
  loading,
  onCancel,
  onChangeReason,
  onConfirm,
  reason,
  visible,
}: {
  loading: boolean;
  onCancel: () => void;
  onChangeReason: (reason: string) => void;
  onConfirm: () => void;
  reason: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Cancelar cita</Text>
          <Text style={styles.description}>Escribe el motivo de cancelacion para enviarlo a la clinica.</Text>
          <TextInput
            multiline
            onChangeText={onChangeReason}
            placeholder="No podre asistir"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={reason}
          />
          <View style={styles.actions}>
            <AppButton label="Cerrar" onPress={onCancel} variant="secondary" />
            <AppButton label="Confirmar cancelacion" loading={loading} onPress={onConfirm} variant="danger" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    gap: 14,
    padding: 20,
    width: '100%',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 110,
    padding: 14,
    textAlignVertical: 'top',
  },
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
});
