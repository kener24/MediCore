import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getInventoryItems, getInventoryLots } from "../../api/inventoryApi";
import { cancelClinicalConsumption, createConsultationConsumption, getConsultationConsumptions } from "../../api/medicalRecordsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table } from "../../components/ui/Table";
import type { InventoryItem, InventoryLot } from "../../types/inventory";
import type { ClinicalSupplyUsage, ClinicalSupplyUsageType } from "../../types/medicalRecord";

const money = (value?: string | number | null) => `L ${Number(value ?? 0).toFixed(2)}`;

export function ConsultationSupplyUsageSection({ consultationId, canEdit }: { consultationId: number | string; canEdit: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [usages, setUsages] = useState<ClinicalSupplyUsage[]>([]);
  const [form, setForm] = useState({ inventory_item: "", inventory_lot: "", quantity: "1", usage_type: "medication", billable: true, description: "", notes: "" });
  const selectedItem = items.find((item) => String(item.id) === form.inventory_item);

  async function load() {
    try {
      const [usageData, itemData] = await Promise.all([
        getConsultationConsumptions(consultationId),
        getInventoryItems({ active: "true" }),
      ]);
      setUsages(usageData);
      setItems(itemData);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, [consultationId]);

  useEffect(() => {
    if (!form.inventory_item) {
      setLots([]);
      return;
    }
    getInventoryLots({ item: form.inventory_item, active: "true" }).then(setLots).catch(() => setLots([]));
  }, [form.inventory_item]);

  function selectItem(itemId: string) {
    const item = items.find((entry) => String(entry.id) === itemId);
    setForm({ ...form, inventory_item: itemId, inventory_lot: "", description: item?.name || "", usage_type: item?.item_type === "insumo" ? "supply" : "medication" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    if (Number(form.quantity) <= 0) {
      toast.error("La cantidad debe ser mayor que cero.");
      return;
    }
    try {
      await createConsultationConsumption(consultationId, {
        inventory_item: Number(form.inventory_item),
        inventory_lot: form.inventory_lot ? Number(form.inventory_lot) : null,
        quantity: form.quantity,
        usage_type: form.usage_type as ClinicalSupplyUsageType,
        billable: form.billable,
        description: form.description || selectedItem.name,
        notes: form.notes,
      });
      toast.success("Consumo registrado y stock descontado.");
      setForm({ inventory_item: "", inventory_lot: "", quantity: "1", usage_type: "medication", billable: true, description: "", notes: "" });
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  async function cancelUsage(usage: ClinicalSupplyUsage) {
    const reason = window.prompt("Motivo de cancelacion");
    if (!reason) return;
    try {
      await cancelClinicalConsumption(usage.id, reason);
      toast.success("Consumo cancelado y stock revertido.");
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <Card title="Medicamentos e insumos aplicados">
      {canEdit ? (
        <form className="mb-5 grid gap-3 lg:grid-cols-[1fr_150px_130px_130px_auto]" onSubmit={submit}>
          <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" required value={form.inventory_item} onChange={(e) => selectItem(e.target.value)}>
            <option value="">Producto de inventario</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.name} | Stock {item.stock_current} | {money(item.sale_price)}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={form.inventory_lot} onChange={(e) => setForm({ ...form, inventory_lot: e.target.value })}>
            <option value="">Sin lote/FIFO</option>
            {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.lot_number} | {lot.quantity_current}</option>)}
          </select>
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" min="0.01" required step="0.01" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={form.usage_type} onChange={(e) => setForm({ ...form, usage_type: e.target.value })}>
            <option value="medication">Medicamento</option>
            <option value="supply">Insumo</option>
            <option value="injection">Inyeccion</option>
            <option value="serum">Suero</option>
            <option value="wound_care">Curacion</option>
            <option value="nebulization">Nebulizacion</option>
            <option value="other">Otro</option>
          </select>
          <Button type="submit">Aplicar</Button>
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm lg:col-span-2" placeholder="Descripcion para factura/historial" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm lg:col-span-2" placeholder="Notas clinicas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <label className="flex h-10 items-center gap-2 text-sm"><input checked={form.billable} type="checkbox" onChange={(e) => setForm({ ...form, billable: e.target.checked })} />Facturable</label>
        </form>
      ) : null}
      {usages.length ? <Table data={usages} columns={[
        { key: "item", header: "Producto", render: (usage) => usage.description || usage.inventory_item_nombre },
        { key: "qty", header: "Cant.", render: (usage) => usage.quantity },
        { key: "price", header: "Precio", render: (usage) => money(usage.unit_price) },
        { key: "status", header: "Estado", render: (usage) => usage.invoiced ? "Facturado" : usage.status },
        { key: "billable", header: "Facturable", render: (usage) => usage.billable ? "Si" : "No" },
        { key: "actions", header: "Acciones", render: (usage) => canEdit && !usage.invoiced && usage.status !== "cancelled" ? <button className="rounded-md border px-2 py-1 text-xs font-semibold text-rose-700" onClick={() => cancelUsage(usage)} type="button">Cancelar</button> : "-" },
      ]} /> : <EmptyState title="No hay medicamentos o insumos aplicados." description="Los consumos registrados en la consulta apareceran aqui." />}
    </Card>
  );
}
