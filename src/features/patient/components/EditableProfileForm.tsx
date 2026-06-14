import { useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import type {
  PatientProfile,
  PatientProfileUpdatePayload,
} from '@/features/patient/types/patientProfile.types';

type FormState = {
  address: string;
  city: string;
  department: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  phone: string;
};

function clean(value: string) {
  return value.trim();
}

function getInitialForm(profile: PatientProfile): FormState {
  return {
    address: profile.address ?? profile.direccion ?? '',
    city: profile.city ?? profile.ciudad ?? '',
    department: profile.department ?? profile.departamento ?? '',
    email: profile.email ?? profile.correo ?? '',
    emergencyContactName:
      profile.emergency_contact_name ?? profile.contacto_emergencia_nombre ?? '',
    emergencyContactPhone:
      profile.emergency_contact_phone ?? profile.contacto_emergencia_telefono ?? '',
    emergencyContactRelationship:
      profile.emergency_contact_relationship ?? profile.contacto_emergencia_parentesco ?? '',
    phone: profile.phone ?? profile.telefono ?? '',
  };
}

function buildPayload(form: FormState): PatientProfileUpdatePayload {
  return {
    address: clean(form.address),
    direccion: clean(form.address),
    city: clean(form.city),
    ciudad: clean(form.city),
    department: clean(form.department),
    departamento: clean(form.department),
    email: clean(form.email),
    correo: clean(form.email),
    emergency_contact_name: clean(form.emergencyContactName),
    contacto_emergencia_nombre: clean(form.emergencyContactName),
    emergency_contact_phone: clean(form.emergencyContactPhone),
    contacto_emergencia_telefono: clean(form.emergencyContactPhone),
    emergency_contact_relationship: clean(form.emergencyContactRelationship),
    contacto_emergencia_parentesco: clean(form.emergencyContactRelationship),
    phone: clean(form.phone),
    telefono: clean(form.phone),
  };
}

function validate(form: FormState) {
  const email = clean(form.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Ingresa un correo válido.';
  }
  if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) {
    return 'Ingresa un teléfono válido.';
  }
  if (form.emergencyContactPhone && !/^[0-9+\-\s()]{7,20}$/.test(form.emergencyContactPhone)) {
    return 'Ingresa un teléfono de emergencia válido.';
  }
  return '';
}

export function EditableProfileForm({
  onCancel,
  onSubmit,
  profile,
  submitting,
}: {
  onCancel: () => void;
  onSubmit: (payload: PatientProfileUpdatePayload) => Promise<void>;
  profile: PatientProfile;
  submitting?: boolean;
}) {
  const initialForm = useMemo(() => getInitialForm(profile), [profile]);
  const [form, setForm] = useState<FormState>(initialForm);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    const validation = validate(form);
    if (validation) {
      Alert.alert('Perfil', validation);
      return;
    }
    await onSubmit(buildPayload(form));
  }

  return (
    <AppCard style={styles.form}>
      <AppInput
        icon="phone-outline"
        keyboardType="phone-pad"
        label="Teléfono"
        onChangeText={(value) => updateField('phone', value)}
        value={form.phone}
      />
      <AppInput
        autoCapitalize="none"
        icon="email-outline"
        keyboardType="email-address"
        label="Correo"
        onChangeText={(value) => updateField('email', value)}
        value={form.email}
      />
      <AppInput
        icon="map-marker-outline"
        label="Dirección"
        onChangeText={(value) => updateField('address', value)}
        value={form.address}
      />
      <AppInput
        icon="city"
        label="Ciudad"
        onChangeText={(value) => updateField('city', value)}
        value={form.city}
      />
      <AppInput
        icon="map-outline"
        label="Departamento"
        onChangeText={(value) => updateField('department', value)}
        value={form.department}
      />
      <AppInput
        icon="account-heart-outline"
        label="Contacto de emergencia"
        onChangeText={(value) => updateField('emergencyContactName', value)}
        value={form.emergencyContactName}
      />
      <AppInput
        icon="phone-alert-outline"
        keyboardType="phone-pad"
        label="Teléfono emergencia"
        onChangeText={(value) => updateField('emergencyContactPhone', value)}
        value={form.emergencyContactPhone}
      />
      <AppInput
        icon="account-group-outline"
        label="Parentesco"
        onChangeText={(value) => updateField('emergencyContactRelationship', value)}
        value={form.emergencyContactRelationship}
      />
      <AppButton label="Guardar cambios" loading={submitting} onPress={save} />
      <AppButton label="Cancelar" onPress={onCancel} variant="secondary" />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
});
