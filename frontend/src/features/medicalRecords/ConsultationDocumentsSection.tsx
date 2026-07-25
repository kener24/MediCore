import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Download, Eye, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getConsultationDocuments, getDocumentCategories, markDocumentHiddenFromPatient, markDocumentVisibleToPatient, openDocumentFile, uploadDocument } from "../../api/documentsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import type { ClinicalDocument, DocumentCategory } from "../../types/documents";

const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"];

export function ConsultationDocumentsSection({ consultationId, patientId, canEdit }: { consultationId: number; patientId: number; canEdit: boolean }) {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [items, categoryItems] = await Promise.all([getConsultationDocuments(consultationId), getDocumentCategories({ active: "true" })]);
      setDocuments(items);
      setCategories(categoryItems);
    } catch (error) { toast.error(getErrorMessage(error)); }
  }, [consultationId]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || saving) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.includes(extension)) return toast.error("El archivo seleccionado no está permitido.");
    if (file.size > 10 * 1024 * 1024) return toast.error("El archivo excede el tamaño máximo de 10 MB.");
    setSaving(true);
    try {
      await uploadDocument({ patient: patientId, consultation: consultationId, category: category || undefined, title: title.trim() || file.name, file, visible_to_patient: visible });
      toast.success("Documento adjuntado correctamente.");
      setFile(null); setTitle(""); setCategory(""); setVisible(false);
      const input = document.getElementById(`consultation-document-${consultationId}`) as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  }

  async function toggleVisibility(item: ClinicalDocument) {
    try {
      if (item.visible_to_patient) await markDocumentHiddenFromPatient(item.id);
      else await markDocumentVisibleToPatient(item.id);
      toast.success(item.visible_to_patient ? "Documento ocultado al paciente." : "Documento publicado para el paciente.");
      await load();
    } catch (error) { toast.error(getErrorMessage(error)); }
  }

  return (
    <Card title="Documentos adjuntos">
      <div className="space-y-4">
        {documents.length ? <div className="space-y-2">{documents.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3" key={item.id}><div><p className="font-semibold text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.original_filename} | {item.visible_to_patient ? "Visible al paciente" : "Uso interno"}</p></div><div className="flex flex-wrap gap-2"><Button className="h-8 px-3 text-xs" onClick={() => openDocumentFile(item.id, "preview", item.original_filename).catch((error) => toast.error(getErrorMessage(error)))} type="button" variant="outline" icon={<Eye className="h-3.5 w-3.5" />}>Ver</Button><Button className="h-8 px-3 text-xs" onClick={() => openDocumentFile(item.id, "download", item.original_filename).catch((error) => toast.error(getErrorMessage(error)))} type="button" variant="outline" icon={<Download className="h-3.5 w-3.5" />}>Descargar</Button>{canEdit ? <Button className="h-8 px-3 text-xs" onClick={() => toggleVisibility(item)} type="button" variant="secondary">{item.visible_to_patient ? "Ocultar" : "Publicar"}</Button> : null}</div></div>)}</div> : <EmptyState title="No hay documentos adjuntos." description="Los resultados e imágenes de la consulta aparecerán aquí." />}
        {canEdit ? <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}><input accept={allowedExtensions.map((item) => `.${item}`).join(",")} className="h-10 rounded-md border border-slate-300 px-3 py-2 text-sm" id={`consultation-document-${consultationId}`} onChange={(event) => setFile(event.target.files?.[0] ?? null)} required type="file" /><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Nombre del documento" value={title} onChange={(event) => setTitle(event.target.value)} /><select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Sin categoría</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="flex h-10 items-center gap-2 text-sm"><input checked={visible} onChange={(event) => setVisible(event.target.checked)} type="checkbox" />Visible para el paciente</label><Button className="md:col-span-2" disabled={!file || saving} isLoading={saving} icon={<Paperclip className="h-4 w-4" />}>Adjuntar documento</Button></form> : null}
      </div>
    </Card>
  );
}
