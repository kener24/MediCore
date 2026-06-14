import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors } from '@/core/theme/colors';
import type { PatientClinicInfo } from '@/features/patient/types/patientClinic.types';

export function ClinicInfoCard({ clinic }: { clinic: PatientClinicInfo }) {
  const name = clinic.name ?? clinic.nombre ?? 'Clinica';
  const phone = clinic.phone ?? clinic.telefono;
  const email = clinic.email ?? clinic.correo;
  const website = clinic.website ?? clinic.sitio_web;
  const address = clinic.address ?? clinic.direccion;
  const schedule = clinic.schedule ?? clinic.horario;
  const policies = clinic.policies ?? clinic.politicas;

  return (
    <AppCard style={styles.card}>
      {clinic.logo_url ? <Image source={{ uri: clinic.logo_url }} style={styles.logo} /> : null}
      <Text style={styles.name}>{name}</Text>
      <InfoRow icon="map-marker-outline" value={address} />
      <InfoRow icon="clock-outline" value={schedule} />
      <InfoRow icon="file-document-outline" value={policies} />
      <View style={styles.actions}>
        {phone ? (
          <Action icon="phone-outline" label="Llamar" onPress={() => Linking.openURL(`tel:${phone}`)} />
        ) : null}
        {email ? (
          <Action icon="email-outline" label="Correo" onPress={() => Linking.openURL(`mailto:${email}`)} />
        ) : null}
        {website ? (
          <Action
            icon="web"
            label="Web"
            onPress={() => Linking.openURL(website.startsWith('http') ? website : `https://${website}`)}
          />
        ) : null}
      </View>
    </AppCard>
  );
}

function InfoRow({
  icon,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons color={colors.primary} name={icon} size={19} />
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <MaterialCommunityIcons color={colors.primary} name={icon} size={19} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colors.palePrimary,
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  actionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  card: {
    gap: 12,
  },
  infoRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
  },
  infoText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  logo: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    height: 72,
    width: 72,
  },
  name: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.75,
  },
});
