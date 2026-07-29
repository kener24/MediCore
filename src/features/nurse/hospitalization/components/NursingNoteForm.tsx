import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/core/theme/colors';
import type { NursingNotePayload, NursingNotePriority, NursingNoteType } from '@/features/nurse/hospitalization/types/nurseHospitalization.types';

const noteTypes: { label: string; value: NursingNoteType }[] = [
  { label: 'Observación', value: 'observation' },
  { label: 'Evolución', value: 'evolution' },
  { label: 'Incidente', value: 'incident' },
  { label: 'Relacionado a medicamento', value: 'medication_related' },
  { label: 'Cuidado', value: 'care' },
  { label: 'Otro', value: 'other' },
];

const priorities: { label: string; value: NursingNotePriority }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Importante', value: 'important' },
  { label: 'Urgente', value: 'urgent' },
];

const shifts = [
  { label: 'Mañana', value: 'morning' },
  { label: 'Tarde', value: 'afternoon' },
  { label: 'Noche', value: 'night' },
  { label: 'Otro', value: 'other' },
];

export function NursingNoteForm({
  loading,
  onSubmit,
}: {
  loading?: boolean;
  onSubmit: (payload: NursingNotePayload) => void;
}) {
  const [noteType, setNoteType] = useState<NursingNoteType>('observation');
  const [priority, setPriority] = useState<NursingNotePriority>('normal');
  const [content, setContent] = useState('');
  const [shift, setShift] = useState('morning');
  const [error, setError] = useState('');

  function submit() {
    if (loading) return;
    const trimmed = content.trim();
    if (!noteType) {
      setError('Selecciona el tipo de nota.');
      return;
    }
    if (trimmed.length < 5) {
      setError('La nota de enfermería debe tener al menos 5 caracteres.');
      return;
    }
    setError('');
    onSubmit({ content: trimmed, note_type: noteType, priority, shift });
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Tipo de nota</Text>
      <View style={styles.chips}>
        {noteTypes.map((item) => (
          <Chip active={noteType === item.value} disabled={loading} key={item.value} label={item.label} onPress={() => setNoteType(item.value)} />
        ))}
      </View>
      <Text style={styles.label}>Prioridad</Text>
      <View style={styles.chips}>
        {priorities.map((item) => (
          <Chip active={priority === item.value} disabled={loading} key={item.value} label={item.label} onPress={() => setPriority(item.value)} />
        ))}
      </View>
      <Text style={styles.label}>Turno</Text>
      <View style={styles.chips}>
        {shifts.map((item) => (
          <Chip active={shift === item.value} disabled={loading} key={item.value} label={item.label} onPress={() => setShift(item.value)} />
        ))}
      </View>
      <AppInput icon="note-text-outline" label="Contenido" multiline onChangeText={setContent} style={styles.noteInput} value={content} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton disabled={loading} label="Guardar nota de enfermería" loading={loading} onPress={submit} />
    </View>
  );
}

function Chip({ active, disabled, label, onPress }: { active: boolean; disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.chip, active && styles.chipActive, disabled && styles.disabled]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  chipTextActive: {
    color: colors.white,
  },
  disabled: {
    opacity: 0.55,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  form: {
    gap: 14,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  noteInput: {
    minHeight: 130,
    textAlignVertical: 'top',
  },
});
