import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { approvePurchaseOrder, cancelPurchaseOrder, createPurchaseOrder, createSupplier, getPurchaseOrder, getPurchaseOrders, getPurchaseReceipts, getPurchaseReceipt, getPurchaseStats, getSupplier, getSupplierHistory, getSuppliers, receivePurchaseOrder, returnPurchaseItems, reversePurchaseReceipt } from "../../api/purchasesApi";
import { getInventoryItems } from "../../api/inventoryApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PurchaseOrderStatusBadge } from "../../components/ui/PurchaseOrderStatusBadge";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { InventoryItem } from "../../types/inventory";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseStats, Supplier } from "../../types/purchase";
import { cleanDecimal, digitInputProps, onlyDigits, onlyPhoneChars, phoneInputProps } from "../../utils/inputSanitizers";

const money = (value?: string | number | null) => `L ${Number(value ?? 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const operationKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function PurchasesDashboardPage() {
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  useEffect(() => { getPurchaseStats().then(setStats).catch((e) => toast.error(getErrorMessage(e))); }, []);
  if (!stats) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Compras" description="Resumen de ordenes, proveedores y compras del mes." actions={<Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/clinic/purchases/orders/new">Nueva orden</Link>} /><div className="grid gap-4 md:grid-cols-4"><StatCard label="Ordenes" value={stats.total_purchase_orders} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Pendientes" value={stats.pending_orders} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Aprobadas" value={stats.approved_orders} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Parciales" value={stats.partially_received_orders} icon={<PackagePlus className="h-5 w-5" />} /></div><div className="grid gap-4 md:grid-cols-4"><StatCard label="Recibidas" value={stats.received_orders} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Canceladas" value={stats.cancelled_orders} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Total comprado" value={money(stats.total_purchased_amount)} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Proveedores activos" value={stats.active_suppliers} icon={<PackagePlus className="h-5 w-5" />} /></div></div>;
}

export function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", rtn: "", contact_name: "", phone: "", email: "" });
  async function load() { setItems(await getSuppliers(search ? { search } : undefined)); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); try { await createSupplier({ ...form, active: true }); toast.success("Proveedor creado correctamente."); setForm({ name: "", rtn: "", contact_name: "", phone: "", email: "" }); await load(); } catch (err) { toast.error(getErrorMessage(err)); } }
  return <div className="space-y-6"><PageHeader title="Proveedores" description="Catalogo de proveedores por clinica." /><Card><form className="mb-4 grid gap-2 lg:grid-cols-[1fr_130px_1fr_140px_1fr_auto]" onSubmit={submit}><input className="h-10 rounded-md border px-3 text-sm" required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" maxLength={20} placeholder="RTN" value={form.rtn} {...digitInputProps} onChange={(e) => setForm({ ...form, rtn: onlyDigits(e.target.value) })} /><input className="h-10 rounded-md border px-3 text-sm" placeholder="Contacto" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" maxLength={30} placeholder="Telefono" value={form.phone} {...phoneInputProps} onChange={(e) => setForm({ ...form, phone: onlyPhoneChars(e.target.value) })} /><input className="h-10 rounded-md border px-3 text-sm" placeholder="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Crear</button></form><div className="mb-4 flex gap-2"><input className="h-10 flex-1 rounded-md border px-3 text-sm" placeholder="Buscar proveedor" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="rounded-md border px-4 text-sm font-semibold" onClick={() => load()}>Buscar</button></div><Table data={items} columns={[{ key: "name", header: "Nombre", render: (i) => <Link className="font-semibold text-brand-700" to={`/clinic/purchases/suppliers/${i.id}`}>{i.name}</Link> }, { key: "rtn", header: "RTN", render: (i) => i.rtn || "-" }, { key: "contact", header: "Contacto", render: (i) => i.contact_name || "-" }, { key: "phone", header: "Telefono", render: (i) => i.phone || "-" }, { key: "email", header: "Correo", render: (i) => i.email || "-" }, { key: "state", header: "Estado", render: (i) => i.active ? "Activo" : "Inactivo" }]} /></Card></div>;
}

export function SupplierDetailsPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [history, setHistory] = useState<any>(null);
  useEffect(() => { if (id) Promise.all([getSupplier(id), getSupplierHistory(id)]).then(([s, h]) => { setSupplier(s); setHistory(h); }).catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!supplier) return <Loader />;
  return <div className="space-y-6"><PageHeader title={supplier.name} description="Detalle e historial de compras del proveedor." actions={<Link className="rounded-md border px-4 py-2 text-sm font-semibold" to="/clinic/purchases/suppliers">Volver</Link>} /><div className="grid gap-4 md:grid-cols-3"><StatCard label="Total comprado" value={money(history?.total_purchased)} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Ultima compra" value={history?.last_purchase || "-"} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Estado" value={supplier.active ? "Activo" : "Inactivo"} icon={<PackagePlus className="h-5 w-5" />} /></div><Card title="Datos"><div className="grid gap-3 text-sm md:grid-cols-2"><p><b>RTN:</b> {supplier.rtn || "-"}</p><p><b>Contacto:</b> {supplier.contact_name || "-"}</p><p><b>Telefono:</b> {supplier.phone || "-"}</p><p><b>Correo:</b> {supplier.email || "-"}</p><p><b>Ciudad:</b> {supplier.city || "-"}</p><p><b>Pais:</b> {supplier.country || "-"}</p></div></Card><Card title="Ordenes recientes"><Table data={history?.orders ?? []} columns={[{ key: "num", header: "Numero", render: (i: PurchaseOrder) => i.order_number }, { key: "date", header: "Fecha", render: (i) => i.order_date }, { key: "status", header: "Estado", render: (i) => <PurchaseOrderStatusBadge status={i.status} /> }, { key: "total", header: "Total", render: (i) => money(i.total_amount) }]} /></Card></div>;
}

export function PurchaseOrdersPage() {
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("Orden creada por error");
  async function load() { setItems(await getPurchaseOrders()); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function approve(order: PurchaseOrder) { try { await approvePurchaseOrder(order.id); toast.success("Orden aprobada correctamente."); await load(); } catch (e) { toast.error(getErrorMessage(e)); } }
  function openCancel(order: PurchaseOrder) { setCancelling(order); setCancelReason("Orden creada por error"); }
  async function submitCancel(e: FormEvent) { e.preventDefault(); if (!cancelling || !cancelReason.trim()) return; try { await cancelPurchaseOrder(cancelling.id, cancelReason.trim()); toast.success("Orden cancelada correctamente."); setCancelling(null); await load(); } catch (e) { toast.error(getErrorMessage(e)); } }
  const canApprove = (status: string) => ["borrador", "pendiente"].includes(status);
  const canReceive = (status: string) => ["aprobada", "recibida_parcial"].includes(status);
  const canCancel = (status: string) => !["recibida", "cancelada"].includes(status);
  return <div className="space-y-6"><PageHeader title="Ordenes de compra" description="Creacion, aprobacion y recepcion de compras." actions={<Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/clinic/purchases/orders/new">Nueva orden</Link>} /><Card><Table data={items} columns={[{ key: "num", header: "Numero", render: (i) => <Link className="font-semibold text-brand-700" to={`/clinic/purchases/orders/${i.id}`}>{i.order_number}</Link> }, { key: "date", header: "Fecha", render: (i) => i.order_date }, { key: "supplier", header: "Proveedor", render: (i) => i.supplier_nombre || "-" }, { key: "status", header: "Estado", render: (i) => <PurchaseOrderStatusBadge status={i.status} /> }, { key: "total", header: "Total", render: (i) => money(i.total_amount) }, { key: "user", header: "Creada por", render: (i) => i.created_by_nombre || "-" }, { key: "actions", header: "Acciones", render: (i) => <div className="flex flex-wrap gap-2">{canApprove(i.status) ? <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => approve(i)}>Aprobar</Button> : null}{canReceive(i.status) ? <Link className="rounded-md border px-2 py-1 text-xs font-semibold text-slate-700" to={`/clinic/purchases/orders/${i.id}/receive`}>Recibir</Link> : null}{canCancel(i.status) ? <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => openCancel(i)}>Cancelar</Button> : null}</div> }]} /></Card><Modal open={Boolean(cancelling)} title={`Cancelar ${cancelling?.order_number ?? "orden"}`} onClose={() => setCancelling(null)} actions={<><ModalCloseButton onClick={() => setCancelling(null)} /><Button form="cancel-purchase-form" type="submit" variant="danger">Cancelar orden</Button></>}><form id="cancel-purchase-form" className="grid gap-4" onSubmit={submitCancel}><p className="text-sm text-slate-600">Esta accion deja la orden fuera del flujo de recepcion.</p><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Motivo de cancelacion</span><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /></label></form></Modal></div>;
}

export function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState({ supplier: "", order_date: today(), expected_date: "", notes: "" });
  const [lines, setLines] = useState([{ item: "", quantity_ordered: "1", unit_cost: "0", discount_amount: "0", tax_rate: "0" }]);
  useEffect(() => { Promise.all([getSuppliers({ active: "true" }), getInventoryItems({ active: "true" })]).then(([s, p]) => { setSuppliers(s); setProducts(p); }).catch((e) => toast.error(getErrorMessage(e))); }, []);
  const total = useMemo(() => lines.reduce((acc, l) => acc + Math.max(Number(l.quantity_ordered) * Number(l.unit_cost) - Number(l.discount_amount), 0) * (1 + Number(l.tax_rate) / 100), 0), [lines]);
  async function submit(e: FormEvent) { e.preventDefault(); try { const order = await createPurchaseOrder({ ...form, supplier: Number(form.supplier), items: lines.map((l) => ({ ...l, item: Number(l.item) })) }); toast.success("Orden creada correctamente."); navigate(`/clinic/purchases/orders/${order.id}`); } catch (err) { toast.error(getErrorMessage(err)); } }
  return <div className="space-y-6"><PageHeader title="Nueva orden de compra" description="Selecciona proveedor y productos a comprar." /><Card><form className="space-y-4" onSubmit={submit}><div className="grid gap-2 md:grid-cols-4"><select className="h-10 rounded-md border px-3 text-sm" required value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}><option value="">Proveedor</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><input className="h-10 rounded-md border px-3 text-sm" type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>{lines.map((line, index) => <div key={index} className="grid gap-2 lg:grid-cols-[1fr_100px_110px_110px_90px_auto]"><select className="h-10 rounded-md border px-3 text-sm" required value={line.item} onChange={(e) => { const product = products.find((p) => String(p.id) === e.target.value); setLines(lines.map((l, i) => i === index ? { ...l, item: e.target.value, unit_cost: product?.cost_price ?? l.unit_cost } : l)); }}><option value="">Producto</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" value={line.quantity_ordered} onChange={(e) => setLines(lines.map((l, i) => i === index ? { ...l, quantity_ordered: cleanDecimal(e.target.value) } : l))} /><input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" value={line.unit_cost} onChange={(e) => setLines(lines.map((l, i) => i === index ? { ...l, unit_cost: cleanDecimal(e.target.value) } : l))} /><input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" value={line.discount_amount} onChange={(e) => setLines(lines.map((l, i) => i === index ? { ...l, discount_amount: cleanDecimal(e.target.value) } : l))} /><input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" value={line.tax_rate} onChange={(e) => setLines(lines.map((l, i) => i === index ? { ...l, tax_rate: cleanDecimal(e.target.value) } : l))} /><button className="h-10 rounded-md border px-3 text-sm" type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))}>Quitar</button></div>)}<div className="flex items-center justify-between"><button className="rounded-md border px-4 py-2 text-sm font-semibold" type="button" onClick={() => setLines([...lines, { item: "", quantity_ordered: "1", unit_cost: "0", discount_amount: "0", tax_rate: "0" }])}>Agregar producto</button><p className="font-semibold text-slate-900">Total estimado: {money(total)}</p></div><button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Guardar orden</button></form></Card></div>;
}

export function PurchaseOrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  async function load() { if (id) setOrder(await getPurchaseOrder(id)); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!order) return <Loader />;
  const canReceive = ["aprobada", "recibida_parcial"].includes(order.status) && (order.items ?? []).some((item) => Number(item.pending_quantity) > 0);
  return <div className="space-y-6"><PageHeader title={order.order_number} description={`Proveedor: ${order.supplier_nombre ?? "-"}`} actions={<div className="flex gap-2">{canReceive ? <Link className="rounded-md border px-4 py-2 text-sm font-semibold" to={`/clinic/purchases/orders/${order.id}/receive`}>Recibir</Link> : null}<Link className="rounded-md border px-4 py-2 text-sm font-semibold" to="/clinic/purchases/orders">Volver</Link></div>} /><div className="grid gap-4 md:grid-cols-4"><StatCard label="Subtotal" value={money(order.subtotal)} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Descuento" value={money(order.discount_amount)} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Impuesto" value={money(order.tax_amount)} icon={<PackagePlus className="h-5 w-5" />} /><StatCard label="Total" value={money(order.total_amount)} icon={<PackagePlus className="h-5 w-5" />} /></div><Card title="Productos"><Table data={order.items ?? []} columns={[{ key: "item", header: "Producto", render: (i) => i.item_nombre }, { key: "ordered", header: "Pedido", render: (i) => i.quantity_ordered }, { key: "received", header: "Recibido", render: (i) => i.quantity_received }, { key: "pending", header: "Pendiente", render: (i) => i.pending_quantity }, { key: "cost", header: "Costo", render: (i) => money(i.unit_cost) }, { key: "total", header: "Total", render: (i) => money(i.line_total) }]} /></Card><Card title="Recepciones">{(order.receipts ?? []).length ? <Table data={order.receipts ?? []} columns={[{ key: "num", header: "Numero", render: (i) => <Link className="font-semibold text-brand-700" to={`/clinic/purchases/receipts/${i.id}`}>{i.receipt_number}</Link> }, { key: "date", header: "Fecha", render: (i) => i.receipt_date }, { key: "user", header: "Recibido por", render: (i) => i.received_by_nombre || "-" }]} /> : <EmptyState title="No hay recepciones asociadas a esta orden." />}</Card></div>;
}

export function PurchaseReceivePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<Array<{ key: string; purchase_order_item: number; quantity_received: string; lot_number: string; expiration_date: string; notes: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(operationKey);
  useEffect(() => { if (id) getPurchaseOrder(id).then((o) => { setOrder(o); setLines((o.items ?? []).filter((item) => Number(item.pending_quantity) > 0).map((item) => ({ key: operationKey(), purchase_order_item: item.id, quantity_received: item.pending_quantity, lot_number: "", expiration_date: "", notes: "" }))); }).catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!order) return <Loader />;
  const currentOrder = order;
  const pending = (order.items ?? []).filter((item) => Number(item.pending_quantity) > 0);
  const allowed = ["aprobada", "recibida_parcial"].includes(order.status);
  function changeLine(key: string, field: "quantity_received" | "lot_number" | "expiration_date" | "notes", value: string) { setLines((current) => current.map((line) => line.key === key ? { ...line, [field]: field === "quantity_received" ? cleanDecimal(value) : value } : line)); }
  function addLot(item: PurchaseOrderItem) { setLines((current) => [...current, { key: operationKey(), purchase_order_item: item.id, quantity_received: "", lot_number: "", expiration_date: "", notes: "" }]); }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const selected = lines.filter((line) => Number(line.quantity_received) > 0);
    if (!selected.length) { toast.error("Ingresa al menos una cantidad recibida."); return; }
    for (const item of pending) {
      const total = selected.filter((line) => line.purchase_order_item === item.id).reduce((sum, line) => sum + Number(line.quantity_received), 0);
      if (total > Number(item.pending_quantity)) { toast.error(`La cantidad de ${item.item_nombre ?? "producto"} supera lo pendiente.`); return; }
    }
    setSubmitting(true);
    try {
      await receivePurchaseOrder(currentOrder.id, { receipt_date: today(), idempotency_key: idempotencyKey, items: selected.map((line) => ({ ...line, key: undefined, unit_cost: currentOrder.items?.find((item) => item.id === line.purchase_order_item)?.unit_cost, expiration_date: line.expiration_date || null })) }, idempotencyKey);
      toast.success("Recepcion registrada correctamente. Inventario actualizado.");
      navigate(`/clinic/purchases/orders/${currentOrder.id}`);
    } catch (err) { toast.error(getErrorMessage(err)); setIdempotencyKey(operationKey()); }
    finally { setSubmitting(false); }
  }
  return <div className="space-y-6"><PageHeader title={`Recibir ${order.order_number}`} description="Registra recepcion total o parcial y actualiza inventario." /><Card><form className="space-y-5" onSubmit={submit}>{allowed && pending.length ? pending.map((item) => <section key={item.id} className="space-y-2 border-b border-slate-200 pb-4 last:border-0"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.item_nombre}</p><p className="text-xs text-slate-500">Pendiente: {item.pending_quantity} | Lote: {item.requires_lot ? "requerido" : "opcional"}</p></div><Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => addLot(item)}>Agregar lote</Button></div>{lines.filter((line) => line.purchase_order_item === item.id).map((line, index) => <div key={line.key} className="grid gap-2 lg:grid-cols-[100px_140px_150px_1fr_auto]"><input aria-label={`Cantidad lote ${index + 1}`} className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" placeholder="Cantidad" value={line.quantity_received} onChange={(e) => changeLine(line.key, "quantity_received", e.target.value)} /><input aria-label={`Lote ${index + 1}`} className="h-10 rounded-md border px-3 text-sm" placeholder="Lote" required={item.requires_lot && Number(line.quantity_received) > 0} value={line.lot_number} onChange={(e) => changeLine(line.key, "lot_number", e.target.value)} /><input aria-label={`Vencimiento lote ${index + 1}`} className="h-10 rounded-md border px-3 text-sm" type="date" min={today()} required={item.requires_expiration && Number(line.quantity_received) > 0} value={line.expiration_date} onChange={(e) => changeLine(line.key, "expiration_date", e.target.value)} /><input aria-label={`Notas lote ${index + 1}`} className="h-10 rounded-md border px-3 text-sm" placeholder="Notas" value={line.notes} onChange={(e) => changeLine(line.key, "notes", e.target.value)} />{index > 0 ? <Button type="button" variant="outline" className="h-10 px-3 text-xs" onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))}>Quitar</Button> : <span />}</div>)}</section>) : <EmptyState title="No hay productos pendientes." description={allowed ? "La orden ya fue recibida por completo." : "La orden debe estar aprobada antes de registrar una recepcion."} />}<Button type="submit" disabled={!allowed || !pending.length || submitting}>{submitting ? "Registrando..." : "Registrar recepcion"}</Button></form></Card></div>;
}

export function PurchaseReceiptsPage() {
  const [items, setItems] = useState<PurchaseReceipt[]>([]);
  useEffect(() => { getPurchaseReceipts().then(setItems).catch((e) => toast.error(getErrorMessage(e))); }, []);
  return <div className="space-y-6"><PageHeader title="Recepciones" description="Historial de productos recibidos de proveedores." /><Card><Table data={items} columns={[{ key: "num", header: "Recepcion", render: (i) => <Link className="font-semibold text-brand-700" to={`/clinic/purchases/receipts/${i.id}`}>{i.receipt_number}</Link> }, { key: "order", header: "Orden", render: (i) => i.order_number || "-" }, { key: "supplier", header: "Proveedor", render: (i) => i.supplier_nombre || "-" }, { key: "date", header: "Fecha", render: (i) => i.receipt_date }, { key: "user", header: "Recibido por", render: (i) => i.received_by_nombre || "-" }]} /></Card></div>;
}

export function PurchaseReceiptDetailsPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);
  const [actionType, setActionType] = useState<"return" | "reverse" | null>(null);
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [returnKey, setReturnKey] = useState(operationKey);
  async function load() { if (id) setReceipt(await getPurchaseReceipt(id)); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  if (!receipt) return <Loader />;
  const hasReturns = (receipt.items ?? []).some((item) => Number(item.quantity_returned) > 0);
  const hasReturnable = (receipt.items ?? []).some((item) => Number(item.returnable_quantity) > 0);
  function openAction(type: "return" | "reverse") { setActionType(type); setReason(""); setQuantities({}); if (type === "return") setReturnKey(operationKey()); }
  async function submitAction(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim() || !id) return;
    setSubmitting(true);
    try {
      if (actionType === "reverse") {
        await reversePurchaseReceipt(id, reason.trim());
        toast.success("Recepcion revertida y existencias restauradas.");
      } else {
        const items = Object.entries(quantities).filter(([, quantity]) => Number(quantity) > 0).map(([receipt_item, quantity]) => ({ receipt_item: Number(receipt_item), quantity }));
        if (!items.length) { toast.error("Indica al menos una cantidad a devolver."); return; }
        await returnPurchaseItems(id, { reason: reason.trim(), idempotency_key: returnKey, items });
        toast.success("Devolucion a proveedor registrada correctamente.");
      }
      setActionType(null);
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); if (actionType === "return") setReturnKey(operationKey()); }
    finally { setSubmitting(false); }
  }
  return <div className="space-y-6"><PageHeader title={receipt.receipt_number} description={`${receipt.supplier_nombre ?? "-"} | Orden ${receipt.order_number ?? "-"}`} actions={<div className="flex flex-wrap gap-2">{receipt.active && hasReturnable ? <Button variant="outline" onClick={() => openAction("return")}>Devolver</Button> : null}{receipt.active && !hasReturns ? <Button variant="outline" onClick={() => openAction("reverse")}>Revertir</Button> : null}<Link className="rounded-md border px-4 py-2 text-sm font-semibold" to="/clinic/purchases/receipts">Volver</Link></div>} />{!receipt.active ? <Card><p className="font-semibold text-red-700">Recepcion revertida</p><p className="mt-1 text-sm text-slate-600">{receipt.reversal_reason || "Sin detalle disponible."}</p></Card> : null}<Card title="Items recibidos"><Table data={receipt.items ?? []} columns={[{ key: "item", header: "Producto", render: (i) => i.item_nombre }, { key: "qty", header: "Recibido", render: (i) => i.quantity_received }, { key: "returned", header: "Devuelto", render: (i) => i.quantity_returned }, { key: "available", header: "Disponible para devolver", render: (i) => i.returnable_quantity }, { key: "cost", header: "Costo", render: (i) => money(i.unit_cost) }, { key: "lot", header: "Lote", render: (i) => i.lot_number || "-" }, { key: "exp", header: "Vence", render: (i) => i.expiration_date || "-" }, { key: "mov", header: "Movimiento", render: (i) => i.inventory_movement ?? "-" }]} /></Card><Modal open={Boolean(actionType)} title={actionType === "reverse" ? "Revertir recepcion" : "Devolver a proveedor"} onClose={() => setActionType(null)} actions={<><ModalCloseButton onClick={() => setActionType(null)} /><Button form="receipt-action-form" type="submit" variant="danger" disabled={submitting}>{submitting ? "Procesando..." : "Confirmar"}</Button></>}><form id="receipt-action-form" className="grid gap-4" onSubmit={submitAction}><p className="text-sm text-slate-600">{actionType === "reverse" ? "Se crearan movimientos inversos. Solo es posible si toda la existencia recibida sigue disponible." : "La recepcion original se conserva y se registrara una salida trazable."}</p>{actionType === "return" ? (receipt.items ?? []).filter((item) => Number(item.returnable_quantity) > 0).map((item) => <label key={item.id} className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{item.item_nombre} (maximo {item.returnable_quantity})</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" inputMode="decimal" value={quantities[item.id] ?? ""} onChange={(e) => setQuantities({ ...quantities, [item.id]: cleanDecimal(e.target.value) })} /></label>) : null}<label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Motivo</span><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" minLength={5} maxLength={500} required value={reason} onChange={(e) => setReason(e.target.value)} /></label></form></Modal></div>;
}
