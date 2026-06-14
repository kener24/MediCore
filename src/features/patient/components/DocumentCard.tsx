import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/dateUtils';
import { getFileIcon } from '@/core/utils/fileUtils';
import type { PatientDocument } from '@/features/patient/types/patientDocuments.types';

export function DocumentCard({ document, onPress }: { document: PatientDocument; onPress?: () => void }) {
  const fileKind = document.file_type || document.mime_type || document.file_extension || document.original_filename;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <AppCard>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons color={colors.primary} name={getFileIcon(fileKind)} size={24} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{document.title || document.original_filename || 'Documento clinico'}</Text>
            <Text style={styles.meta}>
              {document.category_name || document.category || 'Documento'} ·{' '}
              {formatDate(document.created_at || document.creado_en)}
            </Text>
          </View>
        </View>
        <Text style={styles.type}>{document.file_type || document.file_extension || document.status || 'Archivo'}</Text>
        {document.description ? <Text style={styles.text}>{document.description}</Text> : null}
        <Text style={styles.detailText}>Ver</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
  },
  detailText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
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
  },
  type: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
