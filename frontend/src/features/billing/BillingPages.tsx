import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, DollarSign, Plus, Printer, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { addConsumptionToInvoice, addInventoryItemToInvoice, createBillableService, createCashMovement, createInvoice, createPayment, getBillableServices, getBillingStats, getCashSessions, getCurrentCashSession, getInvoice, getInvoicePayments, getInvoicePrintData, getInvoices, getMyInvoices, getMyPayments, getPayments, getPendingConsumptions, getTodayInvoiceSummary, getTodayInvoices, openCashSession, closeCashSession, voidInvoice } from "../../api/billingApi";
import { getInventoryItems } from "../../api/inventoryApi";
import { getErrorMessage } from "../../api/axios";
import { getPatients } from "../../api/patientsApi";
import { CashStatusBadge, InvoiceStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "../../components/ui/BillingBadges";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { BillableService, BillingStats, CashSession, Invoice, InvoicePrintData, Payment, TodayInvoiceSummary } from "../../types/billing";
import type { Patient } from "../../types/patient";
import type { InventoryItem } from "../../types/inventory";
import type { ClinicalSupplyUsage } from "../../types/medicalRecord";

const money = (value?: string | number | null) => `L ${Number(value ?? 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const formatPlainMoney = (value?: string | number | null) => Number(value ?? 0).toFixed(2);
const formatInvoiceDate = (value?: string | null) => value || today();
const formatInvoiceTime = () => new Date().toLocaleTimeString("es-HN", { hour12: false });

function amountToLempiras(value?: string | number | null) {
  const total = Number(value ?? 0);
  const integer = Math.floor(total);
  const cents = Math.round((total - integer) * 100);
  const units = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const tens = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const toWords = (num: number): string => {
    if (num === 0) return "CERO";
    if (num === 100) return "CIEN";
    if (num < 20) return units[num];
    if (num < 30) return num === 20 ? "VEINTE" : `VEINTI${units[num - 20].toLowerCase()}`.toUpperCase();
    if (num < 100) return `${tens[Math.floor(num / 10)]}${num % 10 ? ` Y ${units[num % 10]}` : ""}`;
    if (num < 1000) return `${hundreds[Math.floor(num / 100)]}${num % 100 ? ` ${toWords(num % 100)}` : ""}`;
    if (num < 1000000) {
      const thousands = Math.floor(num / 1000);
      const rest = num % 1000;
      return `${thousands === 1 ? "MIL" : `${toWords(thousands)} MIL`}${rest ? ` ${toWords(rest)}` : ""}`;
    }
    return String(num);
  };
  return `${toWords(integer)} CON ${String(cents).padStart(2, "0")}/100 LEMPIRAS`;
}

interface InvoiceDraftItem {
  item_type: "service" | "inventory_item" | "medication" | "supply" | "procedure" | "consumption" | "manual";
  service: string;
  inventory_item: string;
  related_consumption: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_rate: string;
}

const emptyInvoiceItem = (): InvoiceDraftItem => ({ item_type: "manual", service: "", inventory_item: "", related_consumption: "", description: "", quantity: "1", unit_price: "0.00", discount_amount: "0.00", tax_rate: "0.00" });

function lineTotals(item: InvoiceDraftItem) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unit_price || 0);
  const discount = Number(item.discount_amount || 0);
  const taxableBase = Math.max(quantity * unitPrice - discount, 0);
  const tax = taxableBase * (Number(item.tax_rate || 0) / 100);
  return { subtotal: quantity * unitPrice, discount, tax, total: taxableBase + tax };
}

function cleanDecimal(value: string, fallback = "0.00") {
  const next = value.replace(/[^\d.]/g, "");
  const parts = next.split(".");
  if (parts.length <= 1) return next;
  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}` || fallback;
}

export function BillingDashboardPage() {
  const [summary, setSummary] = useState<TodayInvoiceSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState({ amount: "", method: "efectivo", reference: "", notes: "" });
  const navigate = useNavigate();

  async function load() {
    try {
      const [summaryData, invoiceData] = await Promise.all([getTodayInvoiceSummary(), getTodayInvoices()]);
      setSummary(summaryData);
      setInvoices(invoiceData);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, []);

  function openPayment(inv: Invoice) {
    setPaying(inv);
    setPayment({ amount: inv.balance_due, method: "efectivo", reference: "", notes: "" });
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!paying) return;
    if (Number(payment.amount) <= 0 || Number(payment.amount) > Number(paying.balance_due)) {
      toast.error("El monto debe ser mayor que cero y no puede exceder el saldo.");
      return;
    }
    try {
      await createPayment({ invoice: paying.id, amount: payment.amount, method: payment.method as Payment["method"], reference: payment.reference, notes: payment.notes });
      toast.success("Pago registrado correctamente.");
      setPaying(null);
      navigate(`/clinic/billing/invoices/${paying.id}/print`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  if (!summary) return <Loader />;
  return (
    <div className="space-y-6">
      <PageHeader title="Facturacion" description="Resumen y facturas emitidas hoy." actions={<Link className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white" to="/clinic/billing/invoices">Todas las facturas</Link>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Facturado hoy" value={money(summary.total_invoiced)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Cobrado hoy" value={money(summary.total_paid)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Pendiente hoy" value={money(summary.total_balance)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Facturas hoy" value={summary.total_invoices} icon={<DollarSign className="h-5 w-5" />} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pagadas" value={summary.paid_count} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Pendientes" value={summary.pending_count} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Anuladas" value={summary.void_count} icon={<DollarSign className="h-5 w-5" />} />
      </div>
      <Card title="Facturas de hoy">
        {invoices.length ? <Table data={invoices} columns={[
          { key: "num", header: "Numero", render: (i) => i.invoice_number },
          { key: "patient", header: "Paciente", render: (i) => i.patient_nombre },
          { key: "date", header: "Fecha", render: (i) => i.issue_date },
          { key: "total", header: "Total", render: (i) => money(i.total_amount) },
          { key: "paid", header: "Pagado", render: (i) => money(i.paid_amount) },
          { key: "balance", header: "Saldo", render: (i) => money(i.balance_due) },
          { key: "status", header: "Estado", render: (i) => <InvoiceStatusBadge status={i.status} /> },
          { key: "actions", header: "Acciones", render: (i) => <div className="flex flex-wrap gap-2"><Link className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold text-slate-700" to={`/clinic/billing/invoices/${i.id}`}>Ver</Link><Link className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold text-slate-700" to={`/clinic/billing/invoices/${i.id}/print`}>Imprimir</Link>{Number(i.balance_due) > 0 && i.status !== "anulada" ? <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => openPayment(i)}>Registrar pago</Button> : null}</div> },
        ]} /> : <EmptyState title="No hay facturas emitidas hoy." description="Cuando emitas facturas hoy apareceran aqui." />}
      </Card>
      <Modal open={Boolean(paying)} title={`Registrar pago ${paying?.invoice_number ?? ""}`} onClose={() => setPaying(null)} actions={<><Button variant="outline" onClick={() => { if (paying) navigate(`/clinic/billing/invoices/${paying.id}`); }}>Omitir pago por ahora</Button><Button form="dashboard-payment-form" type="submit">Registrar pago</Button></>}>
        <form id="dashboard-payment-form" className="grid gap-4" onSubmit={submitPayment}>
          <p className="text-sm text-slate-600">Saldo pendiente: <b>{money(paying?.balance_due)}</b></p>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Monto</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" inputMode="decimal" max={paying?.balance_due} min="0.01" required step="0.01" type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: cleanDecimal(e.target.value) })} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Metodo</span><select className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" required value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="deposito">Deposito</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Referencia</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Notas</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label>
        </form>
      </Modal>
    </div>
  );
}

export function BillableServicesPage() {
  const [items, setItems] = useState<BillableService[]>([]);
  const [form, setForm] = useState({ name: "", code: "", price: "" });
  async function load() { try { setItems(await getBillableServices()); } catch (e) { toast.error(getErrorMessage(e)); } }
  useEffect(() => { load(); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); if (Number(form.price) < 0) { toast.error("El precio no puede ser negativo."); return; } try { await createBillableService(form); toast.success("Servicio creado correctamente."); setForm({ name: "", code: "", price: "" }); await load(); } catch (err) { toast.error(getErrorMessage(err)); } }
  return <div className="space-y-6"><PageHeader title="Servicios" description="Catalogo de servicios facturables." /><Card><form className="mb-4 grid gap-2 md:grid-cols-[1fr_140px_140px_auto]" onSubmit={submit}><input className="h-10 rounded-md border px-3 text-sm" placeholder="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" placeholder="Codigo" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" min="0" placeholder="Precio" required step="0.01" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: cleanDecimal(e.target.value) })} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Crear</button></form><Table data={items} columns={[{ key: "code", header: "Codigo", render: (i) => i.code || "-" }, { key: "name", header: "Nombre", render: (i) => i.name }, { key: "price", header: "Precio", render: (i) => money(i.price) }, { key: "tax", header: "Impuesto", render: (i) => i.taxable ? `${i.tax_rate}%` : "No" }, { key: "state", header: "Estado", render: (i) => i.active ? "Activo" : "Inactivo" }]} /></Card></div>;
}

export function InvoicesPage({ patientOnly = false }: { patientOnly?: boolean }) {
  const [searchParams] = useSearchParams();
  const initialPatient = searchParams.get("patient") ?? "";
  const [items, setItems] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<BillableService[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [pendingConsumptions, setPendingConsumptions] = useState<ClinicalSupplyUsage[]>([]);
  const [form, setForm] = useState({ patient: initialPatient, issue_date: today(), due_date: addDays(7), notes: "" });
  const [filters, setFilters] = useState({ date_from: "", date_to: "", patient: initialPatient, status: "", payment_method: "", invoice_number: "", search: "", has_balance: "" });
  const [draftItems, setDraftItems] = useState<InvoiceDraftItem[]>([emptyInvoiceItem()]);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState({ amount: "", method: "efectivo", reference: "", notes: "" });
  const navigate = useNavigate();
  async function load(nextFilters = filters) {
    try {
      const activeFilters = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value)) as Record<string, string>;
      setItems(patientOnly ? await getMyInvoices() : await getInvoices(activeFilters));
      if (!patientOnly) {
        setPatients(await getPatients({ is_active: "true" }));
        setServices(await getBillableServices({ active: "true" }));
        setInventoryItems(await getInventoryItems({ active: "true" }));
        if (form.patient) setPendingConsumptions(await getPendingConsumptions({ patient: form.patient }));
      }
    } catch (e) { toast.error(getErrorMessage(e)); }
  }
  useEffect(() => { load(); }, [patientOnly]);
  useEffect(() => {
    if (!form.patient || patientOnly) {
      setPendingConsumptions([]);
      return;
    }
    getPendingConsumptions({ patient: form.patient }).then(setPendingConsumptions).catch(() => setPendingConsumptions([]));
  }, [form.patient, patientOnly]);

  const totals = draftItems.reduce((acc, item) => {
    const values = lineTotals(item);
    return { subtotal: acc.subtotal + values.subtotal, discount: acc.discount + values.discount, tax: acc.tax + values.tax, total: acc.total + values.total };
  }, { subtotal: 0, discount: 0, tax: 0, total: 0 });

  function updateDraftItem(index: number, patch: Partial<InvoiceDraftItem>) {
    setDraftItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function selectService(index: number, serviceId: string) {
    const service = services.find((item) => String(item.id) === serviceId);
    updateDraftItem(index, {
      service: serviceId,
      item_type: "service",
      description: service?.description || service?.name || "",
      unit_price: service?.price ?? "0.00",
      tax_rate: service?.taxable ? service.tax_rate : "0.00",
    });
  }

  function selectInventoryItem(index: number, itemId: string) {
    const item = inventoryItems.find((entry) => String(entry.id) === itemId);
    updateDraftItem(index, {
      item_type: item?.item_type === "medicamento" ? "medication" : item?.item_type === "insumo" ? "supply" : "inventory_item",
      inventory_item: itemId,
      service: "",
      related_consumption: "",
      description: item?.name || "",
      unit_price: item?.sale_price ?? "0.00",
      tax_rate: "0.00",
    });
  }

  function addConsumptionDraft(consumption: ClinicalSupplyUsage) {
    setDraftItems([
      ...draftItems,
      {
        item_type: "consumption",
        service: "",
        inventory_item: "",
        related_consumption: String(consumption.id),
        description: consumption.description || consumption.inventory_item_nombre || "Consumo clinico",
        quantity: consumption.quantity,
        unit_price: consumption.unit_price,
        discount_amount: "0.00",
        tax_rate: "0.00",
      },
    ]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const validItems = draftItems.filter((item) => item.description.trim() && Number(item.quantity) > 0);
    if (form.due_date && form.issue_date && form.due_date < form.issue_date) {
      toast.error("La fecha de vencimiento no puede ser menor que la fecha de emision.");
      return;
    }
    const invalidItem = draftItems.find((item) => Number(item.quantity) <= 0 || Number(item.unit_price) < 0 || Number(item.discount_amount) < 0 || Number(item.tax_rate) < 0 || Number(item.tax_rate) > 100 || lineTotals(item).discount > lineTotals(item).subtotal);
    if (invalidItem) {
      toast.error("Revisa cantidades, precios, descuentos e impuestos de los items.");
      return;
    }
    if (!validItems.length) {
      toast.error("Agrega al menos un item valido a la factura.");
      return;
    }
    setSaving(true);
    try {
      const invoice = await createInvoice({
        patient: Number(form.patient),
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        notes: form.notes,
        items: validItems.map((item) => ({
          item_type: item.item_type,
          service: item.service ? Number(item.service) : null,
          inventory_item: item.inventory_item ? Number(item.inventory_item) : null,
          related_consumption: item.related_consumption ? Number(item.related_consumption) : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
          tax_rate: item.tax_rate,
        })),
      });
      toast.success("Factura creada correctamente.");
      setForm({ patient: "", issue_date: today(), due_date: addDays(7), notes: "" });
      setDraftItems([emptyInvoiceItem()]);
      await load();
      setPaying(invoice);
      setPayment({ amount: invoice.balance_due, method: "efectivo", reference: "", notes: "" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openPayment(inv: Invoice) {
    setPaying(inv);
    setPayment({ amount: inv.balance_due, method: "efectivo", reference: "", notes: "" });
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!paying) return;
    if (Number(payment.amount) <= 0 || Number(payment.amount) > Number(paying.balance_due)) {
      toast.error("El monto debe ser mayor que cero y no puede exceder el saldo.");
      return;
    }
    try {
      await createPayment({ invoice: paying.id, amount: payment.amount, method: payment.method as Payment["method"], reference: payment.reference, notes: payment.notes });
      toast.success("Pago registrado correctamente.");
      setPaying(null);
      navigate(`/clinic/billing/invoices/${paying.id}/print`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={patientOnly ? "Mis facturas" : "Todas las facturas"} description={patientOnly ? "Cuentas por cobrar y estado de pago." : "Consulta, filtra y gestiona facturas de la clinica."} />
      {!patientOnly ? (
        <Card title="Nueva factura">
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="block space-y-1.5 md:col-span-2"><span className="text-sm font-medium text-slate-700">Paciente</span><select className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" required value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}><option value="">Selecciona paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}</select></label>
              <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Fecha emision</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></label>
              <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Vence</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Items de factura</h3>
                <Button type="button" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => setDraftItems([...draftItems, emptyInvoiceItem()])}>Agregar item</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-white text-xs font-semibold uppercase text-slate-500"><tr><th className="px-3 py-3 text-left">Tipo</th><th className="px-3 py-3 text-left">Servicio / Producto</th><th className="px-3 py-3 text-left">Descripcion</th><th className="px-3 py-3 text-left">Cant.</th><th className="px-3 py-3 text-left">Precio</th><th className="px-3 py-3 text-left">Desc.</th><th className="px-3 py-3 text-left">Imp. %</th><th className="px-3 py-3 text-left">Total</th><th className="px-3 py-3" /></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {draftItems.map((item, index) => {
                      const total = lineTotals(item).total;
                      return (
                        <tr key={index}>
                          <td className="px-3 py-2"><select className="h-10 min-w-32 rounded-md border border-slate-300 px-2 text-sm" value={item.item_type} onChange={(e) => updateDraftItem(index, { ...emptyInvoiceItem(), item_type: e.target.value as InvoiceDraftItem["item_type"] })}><option value="manual">Manual</option><option value="service">Servicio</option><option value="inventory_item">Producto</option><option value="medication">Medicamento</option><option value="supply">Insumo</option><option value="procedure">Procedimiento</option><option value="consumption">Consumo</option></select></td>
                          <td className="px-3 py-2">{item.item_type === "service" ? <select className="h-10 min-w-44 rounded-md border border-slate-300 px-2 text-sm" value={item.service} onChange={(e) => selectService(index, e.target.value)}><option value="">Selecciona</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select> : item.item_type === "inventory_item" || item.item_type === "medication" || item.item_type === "supply" ? <select className="h-10 min-w-52 rounded-md border border-slate-300 px-2 text-sm" value={item.inventory_item} onChange={(e) => selectInventoryItem(index, e.target.value)}><option value="">Selecciona</option>{inventoryItems.map((product) => <option key={product.id} value={product.id}>{product.name} | Stock {product.stock_current}</option>)}</select> : item.item_type === "consumption" ? <span className="text-xs text-slate-500">Consumo pendiente</span> : <span className="text-xs text-slate-500">Manual</span>}</td>
                          <td className="px-3 py-2"><input className="h-10 min-w-56 rounded-md border border-slate-300 px-2 text-sm" required value={item.description} onChange={(e) => updateDraftItem(index, { description: e.target.value })} /></td>
                          <td className="px-3 py-2"><input className="h-10 w-20 rounded-md border border-slate-300 px-2 text-sm" inputMode="decimal" min="0.01" step="0.01" type="number" value={item.quantity} onChange={(e) => updateDraftItem(index, { quantity: cleanDecimal(e.target.value, "1") })} /></td>
                          <td className="px-3 py-2"><input className="h-10 w-28 rounded-md border border-slate-300 px-2 text-sm" inputMode="decimal" min="0" step="0.01" type="number" value={item.unit_price} onChange={(e) => updateDraftItem(index, { unit_price: cleanDecimal(e.target.value) })} /></td>
                          <td className="px-3 py-2"><input className="h-10 w-28 rounded-md border border-slate-300 px-2 text-sm" inputMode="decimal" min="0" step="0.01" type="number" value={item.discount_amount} onChange={(e) => updateDraftItem(index, { discount_amount: cleanDecimal(e.target.value) })} /></td>
                          <td className="px-3 py-2"><input className="h-10 w-24 rounded-md border border-slate-300 px-2 text-sm" inputMode="decimal" max="100" min="0" step="0.01" type="number" value={item.tax_rate} onChange={(e) => updateDraftItem(index, { tax_rate: cleanDecimal(e.target.value) })} /></td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{money(total)}</td>
                          <td className="px-3 py-2 text-right"><button className="rounded-md p-2 text-rose-600 hover:bg-rose-50" disabled={draftItems.length === 1} type="button" onClick={() => setDraftItems(draftItems.filter((_, itemIndex) => itemIndex !== index))} title="Eliminar item"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {form.patient ? (
              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">Consumos pendientes del paciente</h3>
                </div>
                <div className="p-4">
                  {pendingConsumptions.length ? <Table data={pendingConsumptions} columns={[
                    { key: "product", header: "Producto", render: (c) => c.description || c.inventory_item_nombre },
                    { key: "qty", header: "Cant.", render: (c) => c.quantity },
                    { key: "price", header: "Precio", render: (c) => money(c.unit_price) },
                    { key: "date", header: "Fecha", render: (c) => c.applied_at?.slice(0, 10) },
                    { key: "action", header: "Accion", render: (c) => <Button className="h-8 px-3 text-xs" type="button" variant="outline" onClick={() => addConsumptionDraft(c)}>Agregar a factura</Button> },
                  ]} /> : <EmptyState title="No hay consumos pendientes." description="Los medicamentos e insumos aplicados sin facturar apareceran aqui." />}
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <textarea className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Notas de factura" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between py-1"><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
                <div className="flex justify-between py-1"><span>Descuento</span><b>{money(totals.discount)}</b></div>
                <div className="flex justify-between py-1"><span>Impuesto</span><b>{money(totals.tax)}</b></div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-base"><span>Total</span><b>{money(totals.total)}</b></div>
                <Button className="mt-4 w-full" type="submit" isLoading={saving}>Guardar factura</Button>
              </div>
            </div>
          </form>
        </Card>
      ) : null}
      {!patientOnly ? (
        <Card title="Filtros">
          <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) { toast.error("La fecha desde no puede ser mayor que la fecha hasta."); return; } load(filters); }}>
            <input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            <input className="h-10 rounded-md border px-3 text-sm" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
            <select className="h-10 rounded-md border px-3 text-sm" value={filters.patient} onChange={(e) => setFilters({ ...filters, patient: e.target.value })}><option value="">Todos los pacientes</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}</select>
            <select className="h-10 rounded-md border px-3 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="parcialmente_pagada">Parcial</option><option value="pagada">Pagada</option><option value="anulada">Anulada</option></select>
            <select className="h-10 rounded-md border px-3 text-sm" value={filters.payment_method} onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}><option value="">Todos los metodos</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="deposito">Deposito</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select>
            <select className="h-10 rounded-md border px-3 text-sm" value={filters.has_balance} onChange={(e) => setFilters({ ...filters, has_balance: e.target.value })}><option value="">Todos los saldos</option><option value="true">Con saldo</option><option value="false">Sin saldo</option></select>
            <input className="h-10 rounded-md border px-3 text-sm" placeholder="Numero de factura" value={filters.invoice_number} onChange={(e) => setFilters({ ...filters, invoice_number: e.target.value })} />
            <input className="h-10 rounded-md border px-3 text-sm" placeholder="Busqueda general" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <div className="flex gap-2 md:col-span-4"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="outline" onClick={() => { const clean = { date_from: "", date_to: "", patient: "", status: "", payment_method: "", invoice_number: "", search: "", has_balance: "" }; setFilters(clean); load(clean); }}>Limpiar filtros</Button></div>
          </form>
        </Card>
      ) : null}
      <Card title={patientOnly ? "Mis facturas" : "Facturas registradas"}>
        {items.length ? <Table data={items} columns={[{ key: "num", header: "Numero", render: (i) => i.invoice_number }, { key: "date", header: "Fecha", render: (i) => i.issue_date }, { key: "patient", header: "Paciente", render: (i) => i.patient_nombre }, { key: "total", header: "Total", render: (i) => money(i.total_amount) }, { key: "paid", header: "Pagado", render: (i) => money(i.paid_amount) }, { key: "balance", header: "Saldo", render: (i) => money(i.balance_due) }, { key: "status", header: "Estado", render: (i) => <InvoiceStatusBadge status={i.status} /> }, { key: "actions", header: "Acciones", render: (i) => <div className="flex flex-wrap gap-2"><Link className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold text-slate-700" to={`/clinic/billing/invoices/${i.id}`}>Ver</Link><Link className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold text-slate-700" to={`/clinic/billing/invoices/${i.id}/print`}>Imprimir</Link>{!patientOnly && Number(i.balance_due) > 0 && i.status !== "anulada" ? <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => openPayment(i)}>Registrar pago</Button> : null}</div> }]} /> : <EmptyState title="No hay facturas." description={patientOnly ? "Aun no tienes facturas registradas." : "No hay facturas con los filtros actuales."} />}
      </Card>
      <Modal
        open={Boolean(paying)}
        title={`Registrar pago ${paying?.invoice_number ?? ""}`}
        onClose={() => setPaying(null)}
        actions={<><Button variant="outline" onClick={() => { if (paying) navigate(`/clinic/billing/invoices/${paying.id}`); }}>Omitir pago por ahora</Button><ModalCloseButton onClick={() => setPaying(null)} /><Button form="payment-form" type="submit">Registrar pago</Button></>}
      >
        <form id="payment-form" className="grid gap-4" onSubmit={submitPayment}>
          <p className="text-sm text-slate-600">Saldo pendiente: <b>{money(paying?.balance_due)}</b></p>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Monto</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" inputMode="decimal" max={paying?.balance_due} min="0.01" required step="0.01" type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: cleanDecimal(e.target.value) })} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Metodo</span><select className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="deposito">Deposito</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Referencia</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Notas</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label>
        </form>
      </Modal>
    </div>
  );
}

function LegacyInvoicePrintPage({ patientPortal = false }: { patientPortal?: boolean }) {
  const { id } = useParams();
  const [data, setData] = useState<InvoicePrintData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getInvoicePrintData(id).then(setData).catch((e) => {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(message);
    });
  }, [id]);

  if (error) return <EmptyState title="No se pudo cargar la factura." description={error} />;
  if (!data) return <Loader label="Preparando factura..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <style>{`@media print { body { background: white !important; } aside, header, .no-print { display: none !important; } main { padding: 0 !important; } .print-sheet { border: 0 !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; } }`}</style>
      <div className="no-print flex items-center justify-between gap-3">
        <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700" to={patientPortal ? `/patient/invoices/${id}` : "/clinic/billing/invoices"}><ArrowLeft className="h-4 w-4" />Volver</Link>
        <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimir</Button>
      </div>
      <section className="print-sheet rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="flex gap-4">
            {data.clinic.logo_url ? <img alt={data.clinic.name} className="h-16 w-16 rounded object-contain" src={data.clinic.logo_url} /> : <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-lg font-bold text-slate-700">{data.clinic.name.slice(0, 2).toUpperCase()}</div>}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{data.clinic.fiscal_name || data.clinic.name}</h1>
              <p className="mt-1 text-sm text-slate-600">RTN: {data.clinic.rtn || "-"}</p>
              <p className="text-sm text-slate-600">{data.clinic.address || "-"}</p>
              <p className="text-sm text-slate-600">{data.clinic.phone || "-"} · {data.clinic.email || "-"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase text-slate-500">Factura</p>
            <p className="text-2xl font-bold text-slate-900">{data.invoice.number}</p>
            <p className="mt-2 text-sm text-slate-600">Emision: {data.invoice.issue_date}</p>
            <p className="text-sm text-slate-600">Vence: {data.invoice.due_date || "-"}</p>
          </div>
        </div>
        <div className="grid gap-6 border-b border-slate-200 py-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Paciente</p>
            <p className="mt-1 font-semibold text-slate-900">{data.patient.full_name}</p>
            <p className="text-sm text-slate-600">Identidad: {data.patient.identity || "-"}</p>
            <p className="text-sm text-slate-600">{data.patient.phone || "-"} · {data.patient.email || "-"}</p>
          </div>
          <div className="md:text-right">
            <p className="text-xs font-semibold uppercase text-slate-500">Estado</p>
            <div className="mt-1"><InvoiceStatusBadge status={data.invoice.status} /></div>
          </div>
        </div>
        <table className="mt-6 min-w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr><th className="py-3">Descripcion</th><th className="py-3 text-right">Cant.</th><th className="py-3 text-right">Precio</th><th className="py-3 text-right">Desc.</th><th className="py-3 text-right">Imp.</th><th className="py-3 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((item) => <tr key={item.id}><td className="py-3">{item.description}</td><td className="py-3 text-right">{item.quantity}</td><td className="py-3 text-right">{money(item.unit_price)}</td><td className="py-3 text-right">{money(item.discount_amount)}</td><td className="py-3 text-right">{money(item.tax_amount)}</td><td className="py-3 text-right font-semibold">{money(item.line_total)}</td></tr>)}
          </tbody>
        </table>
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="text-sm text-slate-600">
            {data.invoice.notes ? <p><b>Notas:</b> {data.invoice.notes}</p> : null}
            {data.terms ? <p className="mt-3">{data.terms}</p> : null}
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-1"><span>Subtotal</span><b>{money(data.invoice.subtotal)}</b></div>
            <div className="flex justify-between py-1"><span>Descuento</span><b>{money(data.invoice.discount)}</b></div>
            <div className="flex justify-between py-1"><span>Impuesto</span><b>{money(data.invoice.tax)}</b></div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-base"><span>Total</span><b>{money(data.invoice.total)}</b></div>
            <div className="flex justify-between py-1"><span>Pagado</span><b>{money(data.invoice.paid)}</b></div>
            <div className="flex justify-between py-1"><span>Saldo</span><b>{money(data.invoice.balance)}</b></div>
          </div>
        </div>
        {data.footer_text ? <p className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">{data.footer_text}</p> : null}
      </section>
    </div>
  );
}

export function InvoicePrintPage({ patientPortal = false }: { patientPortal?: boolean }) {
  const { id } = useParams();
  const [data, setData] = useState<InvoicePrintData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getInvoicePrintData(id).then(setData).catch((e) => {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(message);
    });
  }, [id]);

  if (error) return <EmptyState title="No se pudo cargar la factura." description={error} />;
  if (!data) return <Loader label="Preparando factura..." />;

  const mainPayment = data.payments.find((payment) => payment.status === "aplicado");
  const invoiceDate = formatInvoiceDate(data.invoice.issue_date);
  const invoiceTime = formatInvoiceTime();
  const patientCode = data.patient.identity || String(data.patient.id).padStart(8, "0");
  const currency = data.clinic.currency || "L.";
  const taxableAmount = Math.max(Number(data.invoice.subtotal) - Number(data.invoice.discount), 0);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <style>{`
        .invoice-ticket { width: 340px; max-width: 100%; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.18; }
        .invoice-ticket table { width: 100%; border-collapse: collapse; }
        .invoice-ticket .divider { border-top: 1px solid #111; }
        .invoice-ticket .amount-row { display: grid; grid-template-columns: 1fr 28px 76px; gap: 5px; align-items: baseline; }
        @page { size: 80mm auto; margin: 4mm; }
        @media print {
          body { background: white !important; }
          aside, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .invoice-ticket { width: 80mm !important; margin: 0 auto !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
      <div className="no-print flex items-center justify-between gap-3">
        <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700" to={patientPortal ? `/patient/invoices/${id}` : "/clinic/billing/invoices"}><ArrowLeft className="h-4 w-4" />Volver</Link>
        <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimir</Button>
      </div>
      <section className="invoice-ticket bg-white px-3 py-4 shadow-soft">
        <div className="text-center">
          {data.clinic.logo_url ? <img alt={data.clinic.name} className="mx-auto mb-2 max-h-14 object-contain" src={data.clinic.logo_url} /> : null}
          <h1 className="text-base font-bold leading-tight">{data.clinic.fiscal_name || data.clinic.name}</h1>
          <p className="font-bold leading-tight">{data.clinic.fiscal_name ? data.clinic.name : ""}</p>
          <p className="mt-4 font-bold">RTN: {data.clinic.rtn || "-"}</p>
          <p className="px-2">{data.clinic.address || "-"}</p>
          <p className="mt-3">Telefono: {data.clinic.phone || "-"}</p>
          <p>E-Mail: {data.clinic.email || "-"}</p>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2 text-sm">
          <div>
            <p>Fecha: {invoiceDate}</p>
            <p>Hora: {invoiceTime}</p>
          </div>
          <p className="self-start text-right">{data.invoice.status === "pagada" ? "PAGADA" : data.invoice.status.toUpperCase()}</p>
        </div>

        <p className="mt-3 text-center text-base font-bold">Factura # {data.invoice.number}</p>
        <p className="mt-3 break-words">{patientCode} - {data.patient.full_name}</p>

        <table className="mt-6">
          <thead>
            <tr className="divider border-b border-black">
              <th className="py-0.5 text-left text-sm">Concepto</th>
              <th className="py-0.5 text-right text-sm">Monto L.</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="max-w-[220px] pr-2">{item.description}</td>
                <td className="whitespace-nowrap text-right">{formatPlainMoney(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-2 text-center font-bold">****** ULTIMA LINEA ******</p>

        <div className="mt-1 text-sm">
          <div className="amount-row"><span className="text-right font-bold">Descuento/Rebaja:</span><span className="font-bold">{currency}</span><span className="text-right">{formatPlainMoney(data.invoice.discount)}</span></div>
          <div className="amount-row"><span className="text-right font-bold">Importe Gravado:</span><span className="font-bold">{currency}</span><span className="text-right">{formatPlainMoney(taxableAmount)}</span></div>
          <div className="amount-row"><span className="text-right font-bold">Importe Exento/ISV:</span><span className="font-bold">{currency}</span><span className="text-right">{Number(data.invoice.tax) > 0 ? "0.00" : formatPlainMoney(taxableAmount)}</span></div>
          <div className="amount-row"><span className="text-right font-bold">Importe Exonerado:</span><span className="font-bold">{currency}</span><span className="text-right">0.00</span></div>
          <div className="amount-row"><span className="text-right font-bold">Impuesto 15%:</span><span className="font-bold">{currency}</span><span className="text-right">{formatPlainMoney(data.invoice.tax)}</span></div>
          <div className="amount-row"><span className="text-right font-bold">Impuesto 18%:</span><span className="font-bold">{currency}</span><span className="text-right">0.00</span></div>
          <div className="amount-row"><span className="text-right font-bold">Recargo:</span><span className="font-bold">{currency}</span><span className="text-right">0.00</span></div>
          <div className="amount-row"><span className="text-right font-bold">Total:</span><span className="font-bold">{currency}</span><span className="text-right">{formatPlainMoney(data.invoice.total)}</span></div>
        </div>

        <p className="mt-3 text-center text-sm">{amountToLempiras(data.invoice.total)}</p>

        <div className="mt-6 space-y-2 text-sm">
          <p>No. correlativo de la orden de compra exenta</p>
          <p className="divider pt-1">No. correlativo de la constancia del registro de exonerado</p>
          <p>Numero identificativo del Registro de la SAG</p>
          <div className="divider h-14" />
        </div>

        <div className="mt-8 text-[11px] leading-tight">
          <p>CAI: Pendiente de configurar</p>
          <p>Fecha Limite de Emision: Pendiente</p>
          <p>Rango Autorizado:</p>
          <p>Pendiente</p>
          <p>Refer.Sis.: {data.invoice.number}; Fecha Impresion: {invoiceDate} {invoiceTime}</p>
          <p className="mt-3">Tipo de Pago:</p>
          <p>{mainPayment ? `${mainPayment.method.toUpperCase()}${mainPayment.reference ? ` RefNo.${mainPayment.reference}` : ""}` : "PENDIENTE DE PAGO"}</p>
          <p className="mt-3">Original: Cliente</p>
          <p>Copia: Obligado tributario emisor</p>
        </div>

        <p className="mx-auto mt-4 w-[285px] border-2 border-black px-2 py-1 text-center text-base font-bold leading-tight">La Factura solo es valido con el sello de pagado</p>
        <p className="mt-3 text-center text-sm">{data.footer_text || "La factura es beneficio de todos, exijala"}</p>
        {data.terms ? <p className="mt-2 text-center text-[11px] leading-tight">{data.terms}</p> : null}
      </section>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payment, setPayment] = useState({ amount: "", method: "efectivo", reference: "", notes: "" });
  const navigate = useNavigate();

  async function load() {
    if (!id) return;
    try {
      const [invoiceData, paymentData] = await Promise.all([getInvoice(id), getInvoicePayments(id)]);
      setInvoice(invoiceData);
      setPayments(paymentData);
      setPayment((current) => ({ ...current, amount: invoiceData.balance_due }));
    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    if (Number(payment.amount) <= 0 || Number(payment.amount) > Number(invoice.balance_due)) {
      toast.error("El monto debe ser mayor que cero y no puede exceder el saldo.");
      return;
    }
    try {
      await createPayment({ invoice: invoice.id, amount: payment.amount, method: payment.method as Payment["method"], reference: payment.reference, notes: payment.notes });
      toast.success("Pago registrado correctamente.");
      setPaying(false);
      navigate(`/clinic/billing/invoices/${invoice.id}/print`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  async function cancelInvoice() {
    if (!invoice) return;
    const reason = window.prompt("Motivo de anulacion");
    if (!reason) return;
    try {
      const updated = await voidInvoice(invoice.id, reason);
      setInvoice(updated);
      toast.success("Factura anulada correctamente.");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  if (error) return <EmptyState title="No se pudo cargar la factura." description={error} />;
  if (!invoice) return <Loader label="Cargando factura..." />;

  return (
    <div className="space-y-6">
      <PageHeader title={`Factura ${invoice.invoice_number}`} description={invoice.patient_nombre || "Detalle de factura"} actions={<div className="flex gap-2"><Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold text-slate-700" to="/clinic/billing/invoices">Volver</Link><Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold text-slate-700" to={`/clinic/billing/invoices/${invoice.id}/print`}>Imprimir</Link>{Number(invoice.balance_due) > 0 && invoice.status !== "anulada" ? <Button onClick={() => { setPaying(true); setPayment({ amount: invoice.balance_due, method: "efectivo", reference: "", notes: "" }); }}>Registrar pago</Button> : null}</div>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total" value={money(invoice.total_amount)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Pagado" value={money(invoice.paid_amount)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Saldo" value={money(invoice.balance_due)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Estado" value={invoice.status} icon={<DollarSign className="h-5 w-5" />} />
      </div>
      <Card title="Datos de factura" actions={invoice.status !== "anulada" && Number(invoice.paid_amount) <= 0 ? <Button variant="danger" onClick={cancelInvoice}>Anular</Button> : null}>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p><b>Paciente:</b> {invoice.patient_nombre}</p>
          <p><b>Identidad:</b> {invoice.patient_identidad || "-"}</p>
          <p><b>Fecha emision:</b> {invoice.issue_date}</p>
          <p><b>Vence:</b> {invoice.due_date || "-"}</p>
          <p><b>Subtotal:</b> {money(invoice.subtotal)}</p>
          <p><b>Impuesto:</b> {money(invoice.tax_amount)}</p>
        </div>
        {invoice.notes ? <p className="mt-4 text-sm text-slate-600"><b>Notas:</b> {invoice.notes}</p> : null}
      </Card>
      <Card title="Items">
        {invoice.items?.length ? <Table data={invoice.items.filter((item) => item.active)} columns={[{ key: "description", header: "Descripcion", render: (i) => i.description }, { key: "qty", header: "Cant.", render: (i) => i.quantity }, { key: "price", header: "Precio", render: (i) => money(i.unit_price) }, { key: "tax", header: "Imp.", render: (i) => money(i.tax_amount) }, { key: "total", header: "Total", render: (i) => money(i.line_total) }]} /> : <EmptyState title="No hay items." description="Esta factura no tiene items activos." />}
      </Card>
      <Card title="Pagos aplicados">
        {payments.length ? <Table data={payments} columns={[{ key: "number", header: "Pago", render: (i) => i.payment_number }, { key: "date", header: "Fecha", render: (i) => i.payment_date }, { key: "method", header: "Metodo", render: (i) => <PaymentMethodBadge method={i.method} /> }, { key: "amount", header: "Monto", render: (i) => money(i.amount) }, { key: "status", header: "Estado", render: (i) => <PaymentStatusBadge status={i.status} /> }]} /> : <EmptyState title="No hay pagos aplicados." description="Registra un pago para esta factura." />}
      </Card>
      <Modal open={paying} title={`Registrar pago ${invoice.invoice_number}`} onClose={() => setPaying(false)} actions={<><ModalCloseButton onClick={() => setPaying(false)} /><Button form="invoice-detail-payment-form" type="submit">Registrar pago</Button></>}>
        <form id="invoice-detail-payment-form" className="grid gap-4" onSubmit={submitPayment}>
          <p className="text-sm text-slate-600">Saldo pendiente: <b>{money(invoice.balance_due)}</b></p>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Monto</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" inputMode="decimal" max={invoice.balance_due} min="0.01" required step="0.01" type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: cleanDecimal(e.target.value) })} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Metodo</span><select className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" required value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="deposito">Deposito</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Referencia</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Notas</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label>
        </form>
      </Modal>
    </div>
  );
}

export function PaymentsPage({ patientOnly = false }: { patientOnly?: boolean }) {
  const [items, setItems] = useState<Payment[]>([]);
  useEffect(() => { (patientOnly ? getMyPayments() : getPayments()).then(setItems).catch((e) => toast.error(getErrorMessage(e))); }, [patientOnly]);
  return <div className="space-y-6"><PageHeader title={patientOnly ? "Mis pagos" : "Pagos"} description="Pagos aplicados a facturas." /><Card><Table data={items} columns={[{ key: "num", header: "Pago", render: (i) => i.payment_number }, { key: "invoice", header: "Factura", render: (i) => i.invoice_number }, { key: "patient", header: "Paciente", render: (i) => i.patient_nombre }, { key: "method", header: "Metodo", render: (i) => <PaymentMethodBadge method={i.method} /> }, { key: "amount", header: "Monto", render: (i) => money(i.amount) }, { key: "status", header: "Estado", render: (i) => <PaymentStatusBadge status={i.status} /> }]} /></Card></div>;
}

export function CashPage() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [current, setCurrent] = useState<CashSession | null>(null);
  const [cashModal, setCashModal] = useState<"open" | "close" | "movement" | null>(null);
  const [cashForm, setCashForm] = useState({ opening_amount: "0.00", closing_amount: "0.00", movement_type: "ingreso", amount: "0.00", reason: "", notes: "" });
  async function load() { setSessions(await getCashSessions()); try { setCurrent(await getCurrentCashSession()); } catch { setCurrent(null); } }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  function showOpen() { setCashForm({ opening_amount: "0.00", closing_amount: "0.00", movement_type: "ingreso", amount: "0.00", reason: "", notes: "" }); setCashModal("open"); }
  function showClose() { setCashForm({ opening_amount: "0.00", closing_amount: current?.expected_amount ?? "0.00", movement_type: "ingreso", amount: "0.00", reason: "", notes: "" }); setCashModal("close"); }
  function showMovement(type: "ingreso" | "egreso") { setCashForm({ opening_amount: "0.00", closing_amount: "0.00", movement_type: type, amount: "0.00", reason: type === "ingreso" ? "Ingreso manual" : "Egreso manual", notes: "" }); setCashModal("movement"); }
  async function submitCash(e: FormEvent) {
    e.preventDefault();
    try {
      if (cashModal === "open") await openCashSession({ opening_amount: cashForm.opening_amount });
      if (cashModal === "close" && current) await closeCashSession(current.id, { closing_amount: cashForm.closing_amount, notes: cashForm.notes });
      if (cashModal === "movement" && current) await createCashMovement(current.id, { movement_type: cashForm.movement_type as "ingreso" | "egreso", amount: cashForm.amount, reason: cashForm.reason, notes: cashForm.notes });
      toast.success(cashModal === "open" ? "Caja abierta correctamente." : cashModal === "close" ? "Caja cerrada correctamente." : "Movimiento registrado.");
      setCashModal(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }
  return <div className="space-y-6"><PageHeader title="Caja" description="Apertura, cierre y movimientos." actions={current ? <Button variant="danger" onClick={showClose}>Cerrar caja</Button> : <Button onClick={showOpen}>Abrir caja</Button>} />{current ? <Card title="Caja actual" actions={<div className="flex gap-2"><Button variant="outline" onClick={() => showMovement("ingreso")}>Ingreso</Button><Button variant="outline" onClick={() => showMovement("egreso")}>Egreso</Button></div>}><div className="grid gap-4 md:grid-cols-3"><StatCard label="Apertura" value={money(current.opening_amount)} icon={<DollarSign className="h-5 w-5" />} /><StatCard label="Esperado" value={money(current.expected_amount)} icon={<DollarSign className="h-5 w-5" />} /><StatCard label="Movimientos" value={current.movements?.length ?? 0} icon={<DollarSign className="h-5 w-5" />} /></div></Card> : null}<Card title="Sesiones"><Table data={sessions} columns={[{ key: "id", header: "ID", render: (i) => i.id }, { key: "user", header: "Usuario", render: (i) => i.opened_by_nombre }, { key: "open", header: "Apertura", render: (i) => money(i.opening_amount) }, { key: "expected", header: "Esperado", render: (i) => money(i.expected_amount) }, { key: "diff", header: "Diferencia", render: (i) => money(i.difference_amount) }, { key: "status", header: "Estado", render: (i) => <CashStatusBadge status={i.status} /> }]} /></Card><Modal open={Boolean(cashModal)} title={cashModal === "open" ? "Abrir caja" : cashModal === "close" ? "Cerrar caja" : "Registrar movimiento"} onClose={() => setCashModal(null)} actions={<><ModalCloseButton onClick={() => setCashModal(null)} /><Button form="cash-form" type="submit">{cashModal === "open" ? "Abrir" : cashModal === "close" ? "Cerrar" : "Registrar"}</Button></>}><form id="cash-form" className="grid gap-4" onSubmit={submitCash}>{cashModal === "open" ? <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Monto de apertura</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" min="0" required step="0.01" type="number" value={cashForm.opening_amount} onChange={(e) => setCashForm({ ...cashForm, opening_amount: e.target.value })} /></label> : null}{cashModal === "close" ? <><p className="text-sm text-slate-600">Monto esperado: <b>{money(current?.expected_amount)}</b></p><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Monto de cierre</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" min="0" required step="0.01" type="number" value={cashForm.closing_amount} onChange={(e) => setCashForm({ ...cashForm, closing_amount: e.target.value })} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Notas</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={cashForm.notes} onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })} /></label></> : null}{cashModal === "movement" ? <><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Tipo</span><select className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" value={cashForm.movement_type} onChange={(e) => setCashForm({ ...cashForm, movement_type: e.target.value })}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Monto</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" min="0.01" required step="0.01" type="number" value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Razon</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" required value={cashForm.reason} onChange={(e) => setCashForm({ ...cashForm, reason: e.target.value })} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Notas</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={cashForm.notes} onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })} /></label></> : null}</form></Modal></div>;
}
