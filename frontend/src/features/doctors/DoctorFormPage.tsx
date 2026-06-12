import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getClinicUsers } from "../../api/clinicAdminApi";
import { createDoctor, getDoctor, getDoctors, getSpecialties, updateDoctor } from "../../api/doctorsApi";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import type { DoctorPayload, DoctorProfile, MedicalSpecialty } from "../../types/doctor";
import type { User } from "../../types/user";
import { DoctorForm } from "./DoctorForm";

export function DoctorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(id);

  useEffect(() => {
    document.title = isEditing ? "Editar medico | MediCore" : "Nuevo medico | MediCore";
    async function load() {
      try {
        const [specialtyData, doctorData, doctorList] = await Promise.all([
          getSpecialties({ is_active: "true" }),
          id ? getDoctor(id) : Promise.resolve(null),
          getDoctors(),
        ]);
        setSpecialties(specialtyData);
        setDoctor(doctorData);
        if (!id) {
          const clinicUsers = await getClinicUsers({ role: "medico", is_active: "true" });
          const usedUserIds = new Set(doctorList.map((item) => item.user));
          setUsers(clinicUsers.filter((user) => !usedUserIds.has(user.id)));
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEditing]);

  async function submit(payload: DoctorPayload) {
    setSaving(true);
    try {
      if (id) {
        const { user, ...updatePayload } = payload;
        await updateDoctor(id, updatePayload);
        toast.success("Medico actualizado correctamente.");
      } else {
        await createDoctor(payload);
        toast.success("Medico creado correctamente.");
      }
      navigate("/clinic/doctors");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={isEditing ? "Editar medico" : "Nuevo medico"} description="Perfil profesional del medico." />
      <Card>
        <DoctorForm doctor={doctor} users={users} specialties={specialties} isSubmitting={saving} onSubmit={submit} />
      </Card>
    </div>
  );
}
