import { useEffect, useState, type FormEvent } from "react";
import { Package } from "lucide-react";
import { toast } from "sonner";

import { createInventoryCategory, createInventoryItem, getExpiringSoonAlerts, getExpiredAlerts, getInventoryCategories, getInventoryItems, getInventoryLots, getInventoryMovements, getInventoryStats, getLowStockAlerts, stockIn, stockOut } from "../../api/inventoryApi";
import { getErrorMessage } from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { InventoryTypeBadge, MovementTypeBadge, StockBadge } from "../../components/ui/InventoryBadges";
import { Loader } from "../../components/ui/Loader";
import { Modal, ModalCloseButton } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { InventoryCategory, InventoryItem, InventoryLot, InventoryMovement, InventoryStats } from "../../types/inventory";
import { cleanDecimal } from "../../utils/inputSanitizers";

const money = (v?: string | number | null) => `L ${Number(v ?? 0).toFixed(2)}`;

export function InventoryDashboardPage() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  useEffect(() => { getInventoryStats().then(setStats).catch((e) => toast.error(getErrorMessage(e))); }, []);
  if (!stats) return <Loader />;
  return <div className="space-y-6"><PageHeader title="Inventario" description="Resumen de productos, stock y alertas." /><div className="grid gap-4 md:grid-cols-4"><StatCard label="Productos" value={stats.total_items} icon={<Package className="h-5 w-5" />} /><StatCard label="Activos" value={stats.active_items} icon={<Package className="h-5 w-5" />} /><StatCard label="Bajo stock" value={stats.low_stock_items} icon={<Package className="h-5 w-5" />} /><StatCard label="Valor stock" value={money(stats.total_stock_value)} icon={<Package className="h-5 w-5" />} /></div><div className="grid gap-4 md:grid-cols-4"><StatCard label="Vencidos" value={stats.expired_lots} icon={<Package className="h-5 w-5" />} /><StatCard label="Por vencer" value={stats.expiring_soon_lots} icon={<Package className="h-5 w-5" />} /><StatCard label="Movimientos hoy" value={stats.total_movements_today} icon={<Package className="h-5 w-5" />} /><StatCard label="Medicamentos" value={stats.medicines_count} icon={<Package className="h-5 w-5" />} /></div></div>;
}

export function InventoryCategoriesPage() {
  const [items, setItems] = useState<InventoryCategory[]>([]);
  const [name, setName] = useState("");
  async function load() { setItems(await getInventoryCategories()); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); try { await createInventoryCategory({ name }); toast.success("Categoria creada correctamente."); setName(""); await load(); } catch (err) { toast.error(getErrorMessage(err)); } }
  return <div className="space-y-6"><PageHeader title="Categorias" description="Clasificacion de productos de inventario." /><Card><form className="mb-4 grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submit}><input className="h-10 rounded-md border px-3 text-sm" placeholder="Nombre categoria" required value={name} onChange={(e) => setName(e.target.value)} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Crear</button></form><Table data={items} columns={[{ key: "name", header: "Nombre", render: (i) => i.name }, { key: "desc", header: "Descripcion", render: (i) => i.description || "-" }, { key: "state", header: "Estado", render: (i) => i.active ? "Activa" : "Inactiva" }]} /></Card></div>;
}

export function InventoryItemsPage({ doctorOnly = false }: { doctorOnly?: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [form, setForm] = useState({ category: "", name: "", sku: "", item_type: "medicamento", unit: "unidad", cost_price: "0", sale_price: "0", stock_minimum: "0" });
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<"entrada" | "salida">("entrada");
  const [movementForm, setMovementForm] = useState({ quantity: "1", reason: "", unit_cost: "0.00", lot_number: "", expiration_date: "", notes: "" });
  async function load() { setItems(await getInventoryItems(doctorOnly ? { type: "medicamento" } : undefined)); setCategories(await getInventoryCategories({ active: "true" })); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, [doctorOnly]);
  async function submit(e: FormEvent) { e.preventDefault(); try { await createInventoryItem({ ...form, category: Number(form.category), requires_lot: form.item_type === "medicamento", requires_expiration: form.item_type === "medicamento" } as Partial<InventoryItem>); toast.success("Producto creado correctamente."); setForm({ ...form, name: "", sku: "" }); await load(); } catch (err) { toast.error(getErrorMessage(err)); } }
  function openMovement(item: InventoryItem, type: "entrada" | "salida") {
    setMovementItem(item);
    setMovementType(type);
    setMovementForm({ quantity: "1", reason: type === "entrada" ? "Entrada manual" : "Salida manual", unit_cost: item.cost_price || "0.00", lot_number: "", expiration_date: "", notes: "" });
  }
  async function submitMovement(e: FormEvent) {
    e.preventDefault();
    if (!movementItem) return;
    try {
      if (movementType === "entrada") {
        await stockIn(movementItem.id, { quantity: movementForm.quantity, reason: movementForm.reason, unit_cost: movementForm.unit_cost, lot_number: movementForm.lot_number, expiration_date: movementForm.expiration_date, notes: movementForm.notes });
      } else {
        await stockOut(movementItem.id, { quantity: movementForm.quantity, reason: movementForm.reason, notes: movementForm.notes });
      }
      toast.success(movementType === "entrada" ? "Entrada registrada correctamente." : "Salida registrada correctamente.");
      setMovementItem(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }
  return <div className="space-y-6"><PageHeader title={doctorOnly ? "Medicamentos disponibles" : "Productos"} description="Stock actual, precios y alertas." /><Card>{!doctorOnly ? <form className="mb-4 grid gap-2 lg:grid-cols-[1fr_1fr_120px_130px_110px_110px_auto]" onSubmit={submit}><select className="h-10 rounded-md border px-3 text-sm" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="h-10 rounded-md border px-3 text-sm" placeholder="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="h-10 rounded-md border px-3 text-sm" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /><select className="h-10 rounded-md border px-3 text-sm" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}><option value="medicamento">Medicamento</option><option value="insumo">Insumo</option><option value="equipo">Equipo</option><option value="material">Material</option><option value="laboratorio">Laboratorio</option><option value="otro">Otro</option></select><input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" placeholder="Costo" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: cleanDecimal(e.target.value) })} /><input className="h-10 rounded-md border px-3 text-sm" inputMode="decimal" placeholder="Venta" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: cleanDecimal(e.target.value) })} /><button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Crear</button></form> : null}{items.length ? <Table data={items} columns={[{ key: "name", header: "Nombre", render: (i) => <div><p className="font-semibold text-slate-900">{i.name}</p><p className="text-xs text-slate-500">{i.sku || "Sin SKU"} | {i.category_nombre}</p></div> }, { key: "type", header: "Tipo", render: (i) => <InventoryTypeBadge type={i.item_type} /> }, { key: "stock", header: "Stock", render: (i) => `${i.stock_current} ${i.unit}` }, { key: "min", header: "Minimo", render: (i) => i.stock_minimum }, { key: "price", header: "Venta", render: (i) => money(i.sale_price) }, { key: "state", header: "Estado", render: (i) => <StockBadge low={i.low_stock} /> }, { key: "actions", header: "Acciones", render: (i) => !doctorOnly ? <div className="flex gap-2"><Button className="h-8 px-3 text-xs" variant="outline" onClick={() => openMovement(i, "entrada")}>Entrada</Button><Button className="h-8 px-3 text-xs" variant="outline" onClick={() => openMovement(i, "salida")}>Salida</Button></div> : null }]} /> : <EmptyState title="No hay productos." description="Crea productos o ejecuta el seed de inventario." />}</Card><Modal open={Boolean(movementItem)} title={`${movementType === "entrada" ? "Entrada" : "Salida"} de inventario`} onClose={() => setMovementItem(null)} actions={<><ModalCloseButton onClick={() => setMovementItem(null)} /><Button form="inventory-movement-form" type="submit">Registrar</Button></>}><form id="inventory-movement-form" className="grid gap-4" onSubmit={submitMovement}><p className="text-sm text-slate-600">Producto: <b>{movementItem?.name}</b></p><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Cantidad</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" inputMode="decimal" required value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: cleanDecimal(e.target.value) })} /></label>{movementType === "entrada" ? <><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Costo unitario</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" inputMode="decimal" required value={movementForm.unit_cost} onChange={(e) => setMovementForm({ ...movementForm, unit_cost: cleanDecimal(e.target.value) })} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Lote</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" required={movementItem?.requires_lot} value={movementForm.lot_number} onChange={(e) => setMovementForm({ ...movementForm, lot_number: e.target.value })} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Vencimiento</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" required={movementItem?.requires_expiration} type="date" value={movementForm.expiration_date} onChange={(e) => setMovementForm({ ...movementForm, expiration_date: e.target.value })} /></label></div></> : null}<label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Motivo</span><input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm" required value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Notas</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} /></label></form></Modal></div>;
}

export function InventoryLotsPage() {
  const [items, setItems] = useState<InventoryLot[]>([]);
  useEffect(() => { getInventoryLots().then(setItems).catch((e) => toast.error(getErrorMessage(e))); }, []);
  return <div className="space-y-6"><PageHeader title="Lotes" description="Control de cantidades y vencimientos." /><Card><Table data={items} columns={[{ key: "item", header: "Producto", render: (i) => i.item_nombre }, { key: "lot", header: "Lote", render: (i) => i.lot_number }, { key: "exp", header: "Vence", render: (i) => i.expiration_date || "-" }, { key: "qty", header: "Cantidad", render: (i) => i.quantity_current }, { key: "state", header: "Estado", render: (i) => i.expired ? "Vencido" : i.expiring_soon ? "Por vencer" : "Vigente" }]} /></Card></div>;
}

export function InventoryMovementsPage() {
  const [items, setItems] = useState<InventoryMovement[]>([]);
  useEffect(() => { getInventoryMovements().then(setItems).catch((e) => toast.error(getErrorMessage(e))); }, []);
  return <div className="space-y-6"><PageHeader title="Movimientos" description="Historial de entradas, salidas y ajustes." /><Card><Table data={items} columns={[{ key: "date", header: "Fecha", render: (i) => i.creado_en?.slice(0, 10) }, { key: "item", header: "Producto", render: (i) => i.item_nombre }, { key: "lot", header: "Lote", render: (i) => i.lot_number || "-" }, { key: "type", header: "Tipo", render: (i) => <MovementTypeBadge type={i.movement_type} /> }, { key: "qty", header: "Cantidad", render: (i) => i.quantity }, { key: "reason", header: "Motivo", render: (i) => i.reason }, { key: "user", header: "Realizado por", render: (i) => i.performed_by_nombre || "-" }]} /></Card></div>;
}

export function InventoryAlertsPage() {
  const [low, setLow] = useState<InventoryItem[]>([]);
  const [soon, setSoon] = useState<InventoryLot[]>([]);
  const [expired, setExpired] = useState<InventoryLot[]>([]);
  useEffect(() => { Promise.all([getLowStockAlerts(), getExpiringSoonAlerts(30), getExpiredAlerts()]).then(([a, b, c]) => { setLow(a); setSoon(b); setExpired(c); }).catch((e) => toast.error(getErrorMessage(e))); }, []);
  return <div className="space-y-6"><PageHeader title="Alertas de inventario" description="Bajo stock, vencidos y proximos a vencer." /><div className="grid gap-4 lg:grid-cols-3"><Card title="Bajo stock"><p className="text-3xl font-bold text-slate-900">{low.length}</p>{low.map((i) => <p key={i.id} className="mt-2 text-sm text-slate-600">{i.name} - {i.stock_current}</p>)}</Card><Card title="Proximos a vencer"><p className="text-3xl font-bold text-slate-900">{soon.length}</p>{soon.map((i) => <p key={i.id} className="mt-2 text-sm text-slate-600">{i.item_nombre} - {i.expiration_date}</p>)}</Card><Card title="Vencidos"><p className="text-3xl font-bold text-slate-900">{expired.length}</p>{expired.map((i) => <p key={i.id} className="mt-2 text-sm text-slate-600">{i.item_nombre} - {i.expiration_date}</p>)}</Card></div></div>;
}