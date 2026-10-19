import { useEffect, useRef, useState } from "react";
import { FileCog, FilePlus, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, PageHeader } from "@/modules/lgs/components/common";
import { api, loadError, errMsg } from "@/modules/lgs/api";

export const ROLES = [
  { value: "ogrenci_no", label: "Öğrenci No" }, { value: "ad_soyad", label: "Ad Soyad" },
  { value: "ad", label: "Ad" }, { value: "soyad", label: "Soyad" }, { value: "kitapcik", label: "Kitapçık" },
  { value: "sinif", label: "Sınıf" }, { value: "sube", label: "Şube" }, { value: "tc", label: "T.C. No" }, { value: "veli_tel", label: "Veli Telefonu" },
  { value: "cevap", label: "Cevap Alanı" }, { value: "diger", label: "Kullanılmaz" },
];
const roleLabel = (v) => ROLES.find((r) => r.value === v)?.label || v;

function useSamplePreview() {
  const [line, setLine] = useState("");
  const onFile = async (file) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch (e) {
      text = new TextDecoder("windows-1254").decode(buf);
    }
    setLine(text.split(/\r?\n/).find((l) => l.trim()) || "");
  };
  return { line, input: (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-blue-800 hover:underline">
      <input type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="template-sample-input" />
      <Upload className="h-3.5 w-3.5" />Örnek veri dosyasıyla kontrol et{line && ` (satır uzunluğu ${line.length})`}
    </label>
  ), slice: (f) => line.slice(f.start - 1, f.start - 1 + f.length) };
}

const blankField = (start) => ({ name: "YENİ ALAN", r1: 0, r2: 0, c1: 0, c2: 0, kind: "K", direction: "D", charset: "", start, length: 1, role: "diger" });

function FieldEditor({ template, onClose, onSaved }) {
  const [name, setName] = useState(template.name);
  const [busy,setBusy]=useState(false);
  const requestId=useRef(crypto.randomUUID());
  const [fields, setFields] = useState(template.fields);
  const sample = useSamplePreview();
  const set = (i, patch) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const nextStart = fields.reduce((m, f) => Math.max(m, f.start + f.length), 1);

  const save = async () => {
    if(busy)return;setBusy(true);
    try {
      if (template.id) await api.put(`/templates/${template.id}`, { name, fields, request_id:requestId.current, expected_revision:template.revision });
      else await api.post("/templates/manual", { name, fields, request_id:requestId.current, expected_revision:template.revision });
      toast.success("Şablon kaydedildi");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {setBusy(false);}
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-white" data-testid="template-editor-dialog">
        <DialogHeader><DialogTitle>Şablon Alanları</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="template-name-input" />
        <p className="text-xs text-slate-500">Başlangıç ve uzunluk, okuyucunun ürettiği veri satırındaki karakter konumlarıdır. Örnek veri dosyası seçerek her alanın ilk satırda ne okuduğunu görebilirsiniz.</p>
        {sample.input}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-2">Alan</th><th>Yön</th><th>Başlangıç</th><th>Uzunluk</th><th>Rol</th><th>{sample.line ? "Okunan" : "Karakterler"}</th><th /></tr></thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i} className="border-b border-slate-100" data-testid={`template-field-row-${i}`}>
                  <td className="py-1.5 pr-2"><Input className="h-8 w-40" value={f.name} onChange={(e) => set(i, { name: e.target.value })} data-testid={`template-field-name-${i}`} /></td>
                  <td className="pr-2 text-xs text-slate-500">{f.direction === "Y" ? "Yatay" : "Dikey"}</td>
                  <td className="pr-2"><Input type="number" className="h-8 w-20 font-mono" value={f.start} onChange={(e) => set(i, { start: Number(e.target.value) })} data-testid={`template-field-start-${i}`} /></td>
                  <td className="pr-2"><Input type="number" className="h-8 w-20 font-mono" value={f.length} onChange={(e) => set(i, { length: Number(e.target.value) })} data-testid={`template-field-length-${i}`} /></td>
                  <td>
                    <Select value={f.role} onValueChange={(v) => set(i, { role: v, direction: v === "cevap" ? "Y" : f.direction })}>
                      <SelectTrigger className="h-8 w-40" data-testid={`template-field-role-${i}`}><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="max-w-[220px] truncate px-2 font-mono text-xs text-slate-500">{sample.line ? <span className="whitespace-pre rounded bg-amber-50 px-1 text-slate-800">{sample.slice(f)}</span> : f.charset}</td>
                  <td><button className="text-slate-400 hover:text-red-600" onClick={() => setFields(fields.filter((_, j) => j !== i))} data-testid={`template-field-remove-${i}`}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setFields([...fields, blankField(nextStart)])} data-testid="template-field-add-button"><Plus className="mr-1 h-4 w-4" />Alan Ekle</Button>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={busy} onClick={save} data-testid="template-save-button">Kaydet</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ t, onOpen, onDelete, i }) {
  const counts = t.fields.reduce((acc, f) => ({ ...acc, [f.role]: (acc[f.role] || 0) + 1 }), {});
  const width = t.fields.reduce((m, f) => Math.max(m, f.start + f.length - 1), 0);
  return (
    <div className="rise group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,transform] hover:-translate-y-0.5 hover:border-blue-300" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} onClick={onOpen} data-testid={`template-card-${t.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2"><FileCog className="h-4 w-4 shrink-0 text-blue-800" /><span className="font-semibold text-slate-900">{t.name}</span></div>
        <button className="opacity-60 hover:text-red-600 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(t); }} data-testid={`template-delete-${t.id}`}><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700">{counts.cevap || 0} cevap alanı</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{t.fields.length} alan</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">{width} karakter</span>
      </div>
      <div className="mt-2 truncate text-xs text-slate-500">{t.fields.filter((f) => f.role !== "diger" && f.role !== "cevap").map((f) => roleLabel(f.role)).join(" · ")}</div>
    </div>
  );
}

export default function Templates() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const input = useRef(null);
  const load = () => api.get("/templates").then((r) => setItems(r.data)).catch(loadError);

  useEffect(() => {
    load();
  }, []);

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    try {
      const r = await api.post("/templates", fd);
      if (r.data.length) toast.success(`${r.data.length} şablon eklendi`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
    input.current.value = "";
  };

  const remove = async (t) => {
    if (!window.confirm(`"${t.name}" şablonu silinsin mi?`)) return;
    try { await api.delete(`/templates/${t.id}`, {data:{expected_revision:t.revision}}); } catch(e){toast.error(errMsg(e));return;}
    toast.success("Şablon silindi");
    load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Optik Form Tanımları"
        title="FMT Şablonları"
        description="Sekonic okuyucu .fmt form tanımlarını yükleyin. Alanlar otomatik tanınır; dilediğiniz zaman yeni FMT ekleyebilirsiniz."
        actions={<>
          <input ref={input} type="file" multiple accept=".fmt,.FMT" className="hidden" onChange={(e) => upload(e.target.files)} data-testid="fmt-upload-input" />
          <Button variant="outline" onClick={() => setEditing({ name: "Yeni TXT Şablonu", fields: [blankField(1)] })} data-testid="template-new-blank-button"><FilePlus className="mr-2 h-4 w-4" />Boş Şablon</Button>
          <Button className="bg-blue-800 hover:bg-blue-900" onClick={() => input.current.click()} data-testid="fmt-upload-button"><Upload className="mr-2 h-4 w-4" />FMT Yükle</Button>
        </>}
      />
      {!items ? <Loading /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="template-list">
          {items.map((t, i) => <TemplateCard key={t.id} t={t} i={i} onOpen={() => setEditing(t)} onDelete={remove} />)}
        </div>
      )}
      {editing && <FieldEditor template={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
