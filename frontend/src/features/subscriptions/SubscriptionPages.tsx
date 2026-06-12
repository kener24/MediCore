import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { changeClinicPlan, createSubscriptionPlan, getClinicPlanUsage, getClinicSubscription, getClinicSubscriptions, getMyPlanUsage, getMySubscription, getSubscriptionPlans, reactivateClinicSubscription, suspendClinicSubscription, updateSubscriptionPlan } from "../../api/subscriptionsApi";
import { getErrorMessage } from "../../api/axios";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { ClinicSubscription, PlanUsage, SubscriptionPlan } from "../../types/subscription";

const money = (v: string | number) => `$ ${Number(v ?? 0).toFixed(2)}`;
const featureFields = ["allow_billing", "allow_inventory", "allow_purchases", "allow_reports", "allow_audit", "allow_notifications", "allow_patient_portal", "allow_mobile_api"];

function UsageBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0;
  return <div><div className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span>{value}/{max}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div></div>;
}

export function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Partial<SubscriptionPlan>>({ name: "", code: "", price_monthly: "0", price_yearly: "0", max_users: 5, max_doctors: 2, max_patients: 300, max_appointments_per_month: 200, max_storage_mb: 1000, allow_billing: true, allow_mobile_api: true, active: true });
  async function load() { setError(""); try { setPlans(await getSubscriptionPlans()); } catch (e) { const message = getErrorMessage(e); setError(message); toast.error(message); } }
  useEffect(() => { load(); }, []);
  if (error) return <EmptyState title="No se pudieron cargar los planes." description={error} />;
  async function submit(e: FormEvent) { e.preventDefault(); try { if (editing.id) await updateSubscriptionPlan(editing.id, editing); else await createSubscriptionPlan(editing); toast.success("Plan guardado."); await load(); } catch (error) { toast.error(getErrorMessage(error)); } }
  const set = (patch: Partial<SubscriptionPlan>) => setEditing({ ...editing, ...patch });
  return <div className="space-y-6"><PageHeader title="Planes SaaS" description="Limites, precios y modulos por plan." /><Card title={editing.id ? "Editar plan" : "Nuevo plan"}><form className="grid gap-3 lg:grid-cols-4" onSubmit={submit}><input className="h-10 rounded-md border px-3 text-sm" placeholder="Nombre" required value={editing.name ?? ""} onChange={(e) => set({ name: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" placeholder="Codigo" required value={editing.code ?? ""} onChange={(e) => set({ code: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" type="number" placeholder="Precio mensual" value={editing.price_monthly ?? "0"} onChange={(e) => set({ price_monthly: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" type="number" placeholder="Precio anual" value={editing.price_yearly ?? "0"} onChange={(e) => set({ price_yearly: e.target.value })} />{["max_users", "max_doctors", "max_patients", "max_appointments_per_month", "max_storage_mb"].map((key) => <input key={key} className="h-10 rounded-md border px-3 text-sm" type="number" placeholder={key} value={(editing as any)[key] ?? 0} onChange={(e) => set({ [key]: Number(e.target.value) } as any)} />)}<div className="lg:col-span-4 flex flex-wrap gap-2">{featureFields.map((key) => <label key={key} className="rounded-md border px-3 py-2 text-sm"><input className="mr-2" type="checkbox" checked={Boolean((editing as any)[key])} onChange={(e) => set({ [key]: e.target.checked } as any)} />{key.replace("allow_", "")}</label>)}</div><Button>{editing.id ? "Actualizar" : "Crear"}</Button></form></Card><Card title="Planes"><Table data={plans} columns={[{ key: "name", header: "Plan", render: (p) => <button className="font-semibold text-brand-700" onClick={() => setEditing(p)}>{p.name}</button> }, { key: "price", header: "Precio", render: (p) => `${money(p.price_monthly)} / ${money(p.price_yearly)}` }, { key: "limits", header: "Limites", render: (p) => `${p.max_users} usuarios, ${p.max_doctors} medicos, ${p.max_patients} pacientes` }, { key: "features", header: "Modulos", render: (p) => featureFields.filter((f) => (p as any)[f]).length }, { key: "state", header: "Estado", render: (p) => <Badge tone={p.active ? "active" : "inactive"}>{p.active ? "Activo" : "Inactivo"}</Badge> }]} /></Card></div>;
}

export function ClinicSubscriptionsPage() {
  const [items, setItems] = useState<ClinicSubscription[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { getClinicSubscriptions().then(setItems).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <EmptyState title="No se pudieron cargar las suscripciones." description={error} />;
  return <div className="space-y-6"><PageHeader title="Suscripciones de clinicas" description="Planes asignados, estado y vencimientos." /><Card><Table data={items} columns={[{ key: "clinic", header: "Clinica", render: (i) => i.clinic_nombre ?? i.clinic }, { key: "plan", header: "Plan", render: (i) => i.plan_nombre ?? i.plan }, { key: "status", header: "Estado", render: (i) => <Badge tone={["active", "trial"].includes(i.status) ? "active" : "inactive"}>{i.status}</Badge> }, { key: "cycle", header: "Ciclo", render: (i) => i.billing_cycle }, { key: "end", header: "Vence", render: (i) => i.end_date ?? "-" }, { key: "actions", header: "Acciones", render: (i) => <Link className="rounded-md border px-2 py-1 text-xs font-semibold text-brand-700" to={`/superadmin/subscriptions/clinics/${i.clinic}`}>Ver</Link> }]} /></Card></div>;
}

export function ClinicSubscriptionDetailsPage() {
  const { clinicId } = useParams();
  const [subscription, setSubscription] = useState<ClinicSubscription | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plan, setPlan] = useState("");
  const [error, setError] = useState("");
  async function load() {
    if (!clinicId) return;
    setError("");
    try {
      const [s, u, p] = await Promise.all([getClinicSubscription(clinicId), getClinicPlanUsage(clinicId), getSubscriptionPlans()]);
      setSubscription(s); setUsage(u); setPlans(p); setPlan(String(s.plan));
    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(message);
    }
  }
  useEffect(() => { load(); }, [clinicId]);
  if (error) return <EmptyState title="No se pudo cargar la suscripcion." description={error} />;
  if (!subscription || !usage) return <Loader />;
  const currentSubscription = subscription;
  async function change() { if (!clinicId || !plan) return; try { await changeClinicPlan(clinicId, { plan, billing_cycle: currentSubscription.billing_cycle }); toast.success("Plan actualizado."); await load(); } catch (e) { toast.error(getErrorMessage(e)); } }
  async function suspend() { if (!clinicId) return; try { await suspendClinicSubscription(clinicId, "Suspendida desde panel SaaS"); toast.success("Suscripcion suspendida."); await load(); } catch (e) { toast.error(getErrorMessage(e)); } }
  async function reactivate() { if (!clinicId) return; try { await reactivateClinicSubscription(clinicId); toast.success("Suscripcion reactivada."); await load(); } catch (e) { toast.error(getErrorMessage(e)); } }
  return <div className="space-y-6"><PageHeader title={subscription.clinic_nombre ?? "Suscripcion"} description={`${subscription.plan_nombre} - ${subscription.status}`} actions={<div className="flex gap-2"><Button variant="outline" onClick={suspend}>Suspender</Button><Button onClick={reactivate}>Reactivar</Button></div>} /><Card title="Cambiar plan"><div className="flex gap-2"><select className="h-10 rounded-md border px-3 text-sm" value={plan} onChange={(e) => setPlan(e.target.value)}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><Button onClick={change}>Cambiar plan</Button></div></Card><UsagePanel usage={usage} /></div>;
}

function UsagePanel({ usage }: { usage: PlanUsage }) {
  return <Card title="Uso del plan"><div className="grid gap-4 md:grid-cols-2"><UsageBar label="Usuarios" value={usage.users_count} max={usage.max_users} /><UsageBar label="Medicos" value={usage.doctors_count} max={usage.max_doctors} /><UsageBar label="Pacientes" value={usage.patients_count} max={usage.max_patients} /><UsageBar label="Citas del mes" value={usage.appointments_this_month} max={usage.max_appointments_per_month} /><UsageBar label="Almacenamiento MB" value={usage.storage_used_mb} max={usage.max_storage_mb} /></div></Card>;
}

export function MySubscriptionPage() {
  const [subscription, setSubscription] = useState<ClinicSubscription | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([getMySubscription(), getMyPlanUsage()]).then(([s, u]) => { setSubscription(s); setUsage(u); }).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <EmptyState title="No se pudo cargar tu suscripcion." description={error} />;
  if (!subscription || !usage) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Mi suscripcion" description={`${subscription.plan_nombre} - ${subscription.status}`} /><div className="grid gap-4 md:grid-cols-4"><StatCard label="Plan" value={usage.plan} icon={<CreditCard className="h-5 w-5" />} /><StatCard label="Estado" value={subscription.status} icon={<CreditCard className="h-5 w-5" />} /><StatCard label="Ciclo" value={subscription.billing_cycle} icon={<CreditCard className="h-5 w-5" />} /><StatCard label="Vence" value={subscription.end_date ?? "-"} icon={<CreditCard className="h-5 w-5" />} /></div><UsagePanel usage={usage} /></div>;
}
