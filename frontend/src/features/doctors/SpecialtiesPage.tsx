import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getSpecialties } from "../../api/doctorsApi";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import type { MedicalSpecialty } from "../../types/doctor";

export function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Especialidades | MediCore";
    async function load() {
      try {
        setSpecialties(await getSpecialties());
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Especialidades" description="Catalogo de especialidades medicas disponibles." />
      <Card>
        {loading ? (
          <Loader />
        ) : (
          <Table
            data={specialties}
            emptyMessage="No hay especialidades registradas."
            columns={[
              { key: "nombre", header: "Nombre", render: (item) => <span className="font-medium text-slate-900">{item.nombre}</span> },
              { key: "descripcion", header: "Descripcion", render: (item) => item.descripcion || "Sin descripcion" },
              { key: "estado", header: "Estado", render: (item) => <StatusBadge active={item.activo} /> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
