import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { StatusPill } from '@/features/patient/components/StatusPill';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';
import { formatDate } from '@/features/patient/utils/formatters';

export function DocumentCard({ document, onPress }: { document: PatientDocument; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <AppCard>
        <StatusPill label={document.file_type || document.file_extension || document.status} />
        <Text style={styles.title}>{document.title || document.original_filename || 'Documento clinico'}</Text>
        <Text style={styles.meta}>
          {document.category_name || document.category || 'Documento'} · {formatDate(document.creado_en)}
        </Text>
        {document.description ? <Text style={styles.text}>{document.description}</Text> : null}
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
  },
});
