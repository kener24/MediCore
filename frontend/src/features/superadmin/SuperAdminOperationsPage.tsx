import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Database, HardDrive, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

import { getSuperAdminAlerts, getSuperAdminSystemStatus, getSuperAdminUsage } from "../../api/adminApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { SuperAdminAlert, SuperAdminSystemStatus } from "../../types/dashboard";
import type { PlanUsage } from "../../types/subscription";

type ClinicUsage = PlanUsage & { clinic_id: number; clinic_name: string };

export function SuperAdminOperationsPage() {
  const [alerts, setAlerts] = useState<SuperAdminAlert[]>([]);
  const [usage, setUsage] = useState<ClinicUsage[]>([]);
  const [system, setSystem] = useState<SuperAdminSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [alertsData, usageData, statusData] = await Promise.all([
        getSuperAdminAlerts(),
        getSuperAdminUsage(),
        getSuperAdminSystemStatus(),
      ]);
      setAlerts(alertsData.results);
      setUsage(usageData.results);
      setSystem(statusData);
    } catch (cause) {
      const message = getErrorMessage(cause);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { document.title = "Operación SaaS | MediCore"; void load(); }, []);
  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <PageHeader title="Operación del SaaS" description="Uso, alertas y salud técnica agregada, sin información clínica identificable." actions={<Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" />Actualizar</Button>} />
      {error ? <EmptyState title="No se pudo obtener el estado actual." description={error} /> : null}
      {system ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="API" value={system.api} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Base de datos" value={system.database} icon={<Database className="h-5 w-5" />} />
        <StatCard label="Backup" value={system.backup.status} icon={<HardDrive className="h-5 w-5" />} />
        <StatCard label="Clínicas medidas" value={usage.length} icon={<Users className="h-5 w-5" />} />
      </div> : null}
      <Card title="Alertas globales">
        {alerts.length ? <Table data={alerts} columns={[
          { key: "severity", header: "Severidad", render: (item) => <span className={item.severity === "critical" ? "font-semibold text-rose-700" : "font-semibold text-amber-700"}>{item.severity}</span> },
          { key: "clinic", header: "Clínica", render: (item) => item.clinic_name },
          { key: "message", header: "Alerta", render: (item) => item.message },
        ]} /> : <EmptyState title="No hay alertas globales pendientes." description="El sistema no detectó alertas administrativas para las clínicas." />}
      </Card>
      <Card title="Uso por clínica">
        {usage.length ? <Table data={usage} columns={[
          { key: "clinic", header: "Clínica", render: (item) => item.clinic_name },
          { key: "plan", header: "Plan", render: (item) => item.plan },
          { key: "users", header: "Usuarios", render: (item) => `${item.users_count} / ${item.max_users}` },
          { key: "doctors", header: "Médicos", render: (item) => `${item.doctors_count} / ${item.max_doctors}` },
          { key: "patients", header: "Pacientes", render: (item) => `${item.patients_count} / ${item.max_patients}` },
        ]} /> : <EmptyState title="No hay uso para mostrar." description="No hay clínicas con datos de uso disponibles." />}
      </Card>
      <Card title="Controles de seguridad">
        <div className="flex items-start gap-3 text-sm text-slate-600"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" /><p>Esta vista no permite descargar backups, ejecutar tareas del servidor ni consultar expedientes. Las acciones críticas permanecen en flujos confirmados y auditados.</p></div>
      </Card>
    </div>
  );
}
