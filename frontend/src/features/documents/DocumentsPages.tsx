import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Eye, FileUp, FolderCog } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getPatients } from "../../api/patientsApi";
import {
  archiveDocument,
  createDocumentCategory,
  getDocument,
  getDocumentCategories,
  getDocumentStats,
  getDocuments,
  getPatientDocuments,
  getPatientPortalDocument,
  getPatientPortalDocuments,
  markDocumentHiddenFromPatient,
  markDocumentVisibleToPatient,
  openDocumentFile,
  openPatientPortalDocumentFile,
  restoreDocument,
  updateDocument,
  uploadDocument,
  uploadPatientDocument,
} from "../../api/documentsApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Table } from "../../components/ui/Table";
import type { ClinicalDocument, DocumentCategory, DocumentFilters, DocumentStats, DocumentType, DocumentUploadPayload } from "../../types/documents";
import type { Patient } from "../../types/patient";

const allowed = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"];
const maxSizeMb = 10;
const typeOptions = ["clinical", "administrative", "billing", "identity", "consent", "lab_result", "imaging", "prescription", "medical_order", "other"];
const fileSize = (value: number) => value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(2)} MB` : `${(value / 1024).toFixed(1)} KB`;

function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "active" ? "active" : status === "deleted" ? "inactive" : "neutral"}>{status}</Badge>;
}

function TypeBadge({ type }: { type?: string }) {
  return <Badge tone="role">{type || "other"}</Badge>;
}

function BoolBadge({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return <Badge tone={value ? "active" : "inactive"}>{value ? yes : no}</Badge>;
}

function useCategories() {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  useEffect(() => { getDocumentCategories({ active: "true" }).then(setCategories).catch(() => setCategories([])); }, []);
  return categories;
}

function DocumentFiltersBar({ filters, setFilters, categories }: { filters: DocumentFilters; setFilters: (filters: DocumentFilters) => void; categories: DocumentCategory[] }) {
  return <Card><div className="grid gap-3 md:grid-cols-6"><input className="h-10 rounded-md border px-3 text-sm" placeholder="Buscar" value={filters.search ?? ""} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><select className="h-10 rounded-md border px-3 text-sm" value={filters.category ?? ""} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">Categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="h-10 rounded-md border px-3 text-sm" value={filters.document_type ?? ""} onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}><option value="">Tipo</option>{typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}</select><select className="h-10 rounded-md border px-3 text-sm" value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Estado</option><option value="active">Activo</option><option value="archived">Archivado</option><option value="deleted">Eliminado</option></select><select className="h-10 rounded-md border px-3 text-sm" value={filters.visible_to_patient ?? ""} onChange={(e) => setFilters({ ...filters, visible_to_patient: e.target.value })}><option value="">Visibilidad</option><option value="true">Visible paciente</option><option value="false">Oculto paciente</option></select><Button type="button" variant="outline" onClick={() => setFilters({})}>Limpiar</Button></div></Card>;
}

function DocumentsTable({ items, reload }: { items: ClinicalDocument[]; reload: () => void }) {
  async function run(action: () => Promise<unknown>, ok: string) {
    try { await action(); toast.success(ok); reload(); } catch (error) { toast.error(getErrorMessage(error)); }
  }
  return <Table data={items} columns={[
    { key: "title", header: "Titulo", render: (i) => <Link className="font-semibold text-brand-700" to={`/clinic/documents/${i.id}`}>{i.title}</Link> },
    { key: "patient", header: "Paciente", render: (i) => i.patient_nombre ?? i.patient },
    { key: "category", header: "Categoria", render: (i) => i.category_nombre ?? "-" },
    { key: "type", header: "Tipo", render: (i) => <TypeBadge type={i.document_type} /> },
    { key: "file", header: "Archivo", render: (i) => `${i.file_extension.toUpperCase()} · ${fileSize(i.file_size)}` },
    { key: "visible", header: "Paciente", render: (i) => <BoolBadge value={i.visible_to_patient} yes="Visible" no="Oculto" /> },
    { key: "sensitive", header: "Sensible", render: (i) => <BoolBadge value={i.is_sensitive} yes="Si" no="No" /> },
    { key: "status", header: "Estado", render: (i) => <StatusBadge status={i.status} /> },
    { key: "actions", header: "Acciones", render: (i) => <div className="flex flex-wrap gap-1"><Button type="button" variant="outline" className="h-8 px-2" onClick={() => openDocumentFile(i.id, "preview", i.original_filename)} icon={<Eye className="h-3.5 w-3.5" />}>Ver</Button><Button type="button" variant="outline" className="h-8 px-2" onClick={() => openDocumentFile(i.id, "download", i.original_filename)} icon={<Download className="h-3.5 w-3.5" />}>Bajar</Button>{i.status === "archived" ? <Button type="button" variant="secondary" className="h-8 px-2" onClick={() => run(() => restoreDocument(i.id), "Documento restaurado.")}>Restaurar</Button> : <Button type="button" variant="secondary" className="h-8 px-2" onClick={() => run(() => archiveDocument(i.id), "Documento archivado.")}>Archivar</Button>}{i.visible_to_patient ? <Button type="button" variant="outline" className="h-8 px-2" onClick={() => run(() => markDocumentHiddenFromPatient(i.id), "Documento oculto al paciente.")}>Ocultar</Button> : <Button type="button" variant="outline" className="h-8 px-2" onClick={() => run(() => markDocumentVisibleToPatient(i.id), "Documento visible para paciente.")}>Visible</Button>}</div> },
  ]} />;
}

function DocumentUploadForm({ fixedPatient, onUploaded }: { fixedPatient?: string; onUploaded?: () => void }) {
  const categories = useCategories();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<DocumentUploadPayload>>({ patient: fixedPatient ?? "", category: "", title: "", description: "", visible_to_patient: false, is_sensitive: false, notes: "", tags: [] });
  useEffect(() => { if (!fixedPatient) getPatients().then(setPatients).catch(() => setPatients([])); }, [fixedPatient]);
  const selectedFile = form.file;
  function set(patch: Partial<DocumentUploadPayload>) { setForm({ ...form, ...patch }); }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.file) return toast.error("Selecciona un archivo.");
    const ext = form.file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) return toast.error("Tipo de archivo no permitido.");
    if (form.file.size > maxSizeMb * 1024 * 1024) return toast.error("El archivo excede el tamano maximo permitido.");
    if (form.is_sensitive && form.visible_to_patient && !confirm("El documento es sensible y sera visible para paciente. Deseas continuar?")) return;
    setSaving(true);
    try {
      const payload = form as DocumentUploadPayload;
      if (fixedPatient) await uploadPatientDocument(fixedPatient, payload); else await uploadDocument(payload);
      toast.success("Documento subido correctamente.");
      setForm({ patient: fixedPatient ?? "", category: "", title: "", description: "", visible_to_patient: false, is_sensitive: false, notes: "", tags: [] });
      onUploaded?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return <form className="space-y-4" onSubmit={submit}><div className="grid gap-3 md:grid-cols-2">{!fixedPatient ? <select className="h-11 rounded-md border px-3 text-sm" required value={String(form.patient ?? "")} onChange={(e) => set({ patient: e.target.value })}><option value="">Paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.codigo_paciente} - {p.nombre_completo}</option>)}</select> : null}<select className="h-11 rounded-md border px-3 text-sm" value={String(form.category ?? "")} onChange={(e) => set({ category: e.target.value })}><option value="">Categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="h-11 rounded-md border px-3 text-sm" placeholder="Titulo" value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} /><input className="h-11 rounded-md border px-3 text-sm" type="file" required onChange={(e) => set({ file: e.target.files?.[0] })} /><textarea className="min-h-24 rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder="Descripcion" value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} /><textarea className="min-h-20 rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder="Notas internas" value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} /></div><div className="flex flex-wrap items-center gap-3 text-sm"><label><input className="mr-2" type="checkbox" checked={Boolean(form.visible_to_patient)} onChange={(e) => set({ visible_to_patient: e.target.checked })} />Visible para paciente</label><label><input className="mr-2" type="checkbox" checked={Boolean(form.is_sensitive)} onChange={(e) => set({ is_sensitive: e.target.checked })} />Sensible</label>{selectedFile ? <span className="text-slate-500">{selectedFile.name} · {fileSize(selectedFile.size)}</span> : <span className="text-slate-500">Maximo {maxSizeMb} MB. Permitidos: {allowed.join(", ")}</span>}</div><Button isLoading={saving} icon={<FileUp className="h-4 w-4" />}>Subir documento</Button></form>;
}

export function ClinicalDocumentsPage() {
  const categories = useCategories();
  const [filters, setFilters] = useState<DocumentFilters>({ status: "active" });
  const [items, setItems] = useState<ClinicalDocument[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [error, setError] = useState("");
  async function load() { try { setError(""); const [docs, st] = await Promise.all([getDocuments(filters), getDocumentStats(filters)]); setItems(docs); setStats(st); } catch (e) { const message = getErrorMessage(e); setError(message); toast.error(message); } }
  useEffect(() => { load(); }, [JSON.stringify(filters)]);
  if (error) return <EmptyState title="No se pudieron cargar los documentos." description={error} />;
  return <div className="space-y-6"><PageHeader title="Documentos clinicos" description="Archivos, adjuntos y documentos protegidos." actions={<Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/clinic/documents/upload">Subir documento</Link>} />{stats ? <div className="grid gap-4 md:grid-cols-5"><StatCard label="Documentos" value={stats.total_documents} icon={<FolderCog className="h-5 w-5" />} /><StatCard label="Activos" value={stats.active_documents} icon={<FolderCog className="h-5 w-5" />} /><StatCard label="Archivados" value={stats.archived_documents} icon={<FolderCog className="h-5 w-5" />} /><StatCard label="Visibles" value={stats.visible_to_patient} icon={<FolderCog className="h-5 w-5" />} /><StatCard label="MB usados" value={stats.total_storage_mb} icon={<FolderCog className="h-5 w-5" />} /></div> : null}<DocumentFiltersBar filters={filters} setFilters={setFilters} categories={categories} /><Card><DocumentsTable items={items} reload={load} /></Card></div>;
}

export function DocumentUploadPage() {
  const navigate = useNavigate();
  return <div className="space-y-6"><PageHeader title="Subir documento" description="Adjunta archivos clinicos o administrativos." /><Card><DocumentUploadForm onUploaded={() => navigate("/clinic/documents")} /></Card></div>;
}

export function PatientDocumentsPage() {
  const { patientId } = useParams();
  const [items, setItems] = useState<ClinicalDocument[]>([]);
  async function load() { if (patientId) setItems(await getPatientDocuments(patientId)); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, [patientId]);
  if (!patientId) return <EmptyState title="Paciente no encontrado." description="La ruta no incluye paciente." />;
  return <div className="space-y-6"><PageHeader title="Documentos del paciente" description="Adjuntos asociados al paciente." /><Card title="Subir documento"><DocumentUploadForm fixedPatient={patientId} onUploaded={load} /></Card><Card><DocumentsTable items={items} reload={load} /></Card></div>;
}

export function DocumentDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<ClinicalDocument | null>(null);
  const [saving, setSaving] = useState(false);
  async function load() { if (id) setItem(await getDocument(id)); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, [id]);
  const tagText = useMemo(() => item?.tags?.join(", ") ?? "", [item]);
  async function save() {
    if (!id || !item) return;
    setSaving(true);
    try { setItem(await updateDocument(id, { title: item.title, description: item.description, visible_to_patient: item.visible_to_patient, is_sensitive: item.is_sensitive, notes: item.notes, tags: tagText.split(",").map((t) => t.trim()).filter(Boolean) })); toast.success("Documento actualizado."); } catch (e) { toast.error(getErrorMessage(e)); } finally { setSaving(false); }
  }
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title={item.title} description={item.original_filename} actions={<div className="flex gap-2"><Button variant="outline" onClick={() => openDocumentFile(item.id, "preview", item.original_filename)}>Previsualizar</Button><Button variant="outline" onClick={() => openDocumentFile(item.id, "download", item.original_filename)}>Descargar</Button><Button isLoading={saving} onClick={save}>Guardar</Button></div>} /><Card><div className="grid gap-4 md:grid-cols-3"><Info label="Paciente" value={item.patient_nombre} /><Info label="Categoria" value={item.category_nombre} /><Info label="Tipo" value={item.document_type} /><Info label="MIME" value={item.mime_type} /><Info label="Tamano" value={fileSize(item.file_size)} /><Info label="Version" value={String(item.version)} /><div><p className="text-xs font-semibold uppercase text-slate-500">Estado</p><StatusBadge status={item.status} /></div><div><p className="text-xs font-semibold uppercase text-slate-500">Visible</p><BoolBadge value={item.visible_to_patient} yes="Visible" no="Oculto" /></div><div><p className="text-xs font-semibold uppercase text-slate-500">Sensible</p><BoolBadge value={item.is_sensitive} yes="Si" no="No" /></div></div></Card><Card title="Metadata"><div className="grid gap-3"><input className="h-11 rounded-md border px-3 text-sm" value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} /><textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /><textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" value={item.notes ?? ""} onChange={(e) => setItem({ ...item, notes: e.target.value })} /><div className="flex gap-4 text-sm"><label><input className="mr-2" type="checkbox" checked={item.visible_to_patient} onChange={(e) => setItem({ ...item, visible_to_patient: e.target.checked })} />Visible paciente</label><label><input className="mr-2" type="checkbox" checked={item.is_sensitive} onChange={(e) => setItem({ ...item, is_sensitive: e.target.checked })} />Sensible</label></div></div></Card></div>;
}

function Info({ label, value }: { label: string; value?: string | number | null }) { return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-900">{value || "-"}</p></div>; }

export function DocumentCategoriesPage() {
  const [items, setItems] = useState<DocumentCategory[]>([]);
  const [form, setForm] = useState<{ name: string; description: string; document_type: DocumentType }>({ name: "", description: "", document_type: "other" });
  async function load() { setItems(await getDocumentCategories()); }
  useEffect(() => { load().catch((e) => toast.error(getErrorMessage(e))); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); try { await createDocumentCategory(form); toast.success("Categoria creada."); setForm({ name: "", description: "", document_type: "other" }); await load(); } catch (error) { toast.error(getErrorMessage(error)); } }
  return <div className="space-y-6"><PageHeader title="Categorias de documentos" description="Tipos y clasificacion documental." /><Card title="Nueva categoria"><form className="grid gap-3 md:grid-cols-4" onSubmit={submit}><input className="h-10 rounded-md border px-3 text-sm" required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><select className="h-10 rounded-md border px-3 text-sm" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value as DocumentType })}>{typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}</select><input className="h-10 rounded-md border px-3 text-sm" placeholder="Descripcion" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><Button>Crear</Button></form></Card><Card><Table data={items} columns={[{ key: "name", header: "Nombre", render: (i) => i.name }, { key: "type", header: "Tipo", render: (i) => <TypeBadge type={i.document_type} /> }, { key: "scope", header: "Alcance", render: (i) => i.clinic_nombre ?? "Global" }, { key: "active", header: "Estado", render: (i) => <BoolBadge value={i.active} yes="Activa" no="Inactiva" /> }]} /></Card></div>;
}

export function PatientPortalDocumentsPage() {
  const [items, setItems] = useState<ClinicalDocument[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { getPatientPortalDocuments().then(setItems).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, []);
  if (error) return <EmptyState title="No se pudieron cargar tus documentos." description={error} />;
  return <div className="space-y-6"><PageHeader title="Mis documentos" description="Documentos visibles publicados por tu clinica." />{items.length ? <Card><Table data={items} columns={[{ key: "title", header: "Titulo", render: (i) => <Link className="font-semibold text-brand-700" to={`/patient/documents/${i.id}`}>{i.title}</Link> }, { key: "category", header: "Categoria", render: (i) => i.category_nombre ?? "-" }, { key: "type", header: "Tipo", render: (i) => <TypeBadge type={i.document_type} /> }, { key: "date", header: "Fecha", render: (i) => new Date(i.creado_en).toLocaleDateString() }, { key: "actions", header: "Acciones", render: (i) => <Button type="button" variant="outline" className="h-8 px-2" onClick={() => openPatientPortalDocumentFile(i.id, "download", i.original_filename)}>Descargar</Button> }]} /></Card> : <EmptyState title="No hay documentos visibles." description="Cuando tu clinica publique documentos apareceran aqui." />}</div>;
}

export function PatientPortalDocumentDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<ClinicalDocument | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) getPatientPortalDocument(id).then(setItem).catch((e) => { const message = getErrorMessage(e); setError(message); toast.error(message); }); }, [id]);
  if (error) return <EmptyState title="No se pudo cargar el documento." description={error} />;
  if (!item) return <Loader />;
  return <div className="space-y-6"><PageHeader title={item.title} description={item.original_filename} actions={<div className="flex gap-2"><Button variant="outline" onClick={() => openPatientPortalDocumentFile(item.id, "preview", item.original_filename)}>Ver</Button><Button onClick={() => openPatientPortalDocumentFile(item.id, "download", item.original_filename)}>Descargar</Button></div>} /><Card><div className="grid gap-4 md:grid-cols-3"><Info label="Categoria" value={item.category_nombre} /><Info label="Tipo" value={item.document_type} /><Info label="Tamano" value={fileSize(item.file_size)} /><Info label="Extension" value={item.file_extension} /><Info label="Version" value={item.version} /><Info label="Fecha" value={new Date(item.creado_en).toLocaleString()} /></div><p className="mt-4 text-sm text-slate-600">{item.description || "Sin descripcion."}</p></Card></div>;
}
