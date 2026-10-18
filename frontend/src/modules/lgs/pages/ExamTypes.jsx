import { useEffect, useRef, useState } from "react";
import { Info, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, PageHeader, Panel } from "@/modules/lgs/components/common";
import { PENALTIES, api, loadError, errMsg } from "@/modules/lgs/api";

const slug = (s) => s.toLocaleLowerCase("tr-TR").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o")
  .replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `ders_${Date.now()}`;

const EMPTY = { name: "Yeni Sınav Türü", description: "", base_score: 200, max_score: 500, default_penalty: 4, tasp_min: null, tasp_max: null, sd_source: "exam",
  subjects: [{ key: "ders_1", name: "Ders 1", question_count: 40, coefficient: 1, mean: 15, sd: 8 }] };

function SubjectsTable({ subjects, onChange }) {
  const set = (i, patch) => onChange(subjects.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const numCell = (i, k, step = "0.01") => (
    <Input type="number" step={step} className="h-9 w-24 font-mono" value={subjects[i][k]} onChange={(e) => set(i, { [k]: e.target.value === "" ? "" : Number(e.target.value) })} data-testid={`subject-${k}-${i}`} />
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-2">Ders</th><th>Soru</th><th>Katsayı</th><th>Ortalama (net)</th><th>Standart Sapma</th><th /></tr></thead>
        <tbody>
          {subjects.map((s, i) => (
            <tr key={i} className="border-b border-slate-100" data-testid={`subject-row-${i}`}>
              <td className="py-2 pr-2"><Input className="h-9 min-w-[160px]" value={s.name} onChange={(e) => set(i, { name: e.target.value })} data-testid={`subject-name-${i}`} /></td>
              <td className="pr-2">{numCell(i, "question_count", "1")}</td>
              <td className="pr-2">{numCell(i, "coefficient")}</td>
              <td className="pr-2">{numCell(i, "mean")}</td>
              <td className="pr-2">{numCell(i, "sd")}</td>
              <td><button className="text-slate-400 hover:text-red-600" onClick={() => onChange(subjects.filter((_, j) => j !== i))} data-testid={`subject-remove-${i}`}><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="outline" size="sm" className="mt-3" data-testid="subject-add-button"
        onClick={() => onChange([...subjects, { key: `ders_${subjects.length + 1}_${Date.now() % 1000}`, name: `Ders ${subjects.length + 1}`, question_count: 20, coefficient: 1, mean: 10, sd: 5 }])}>
        <Plus className="mr-1 h-4 w-4" />Ders Ekle
      </Button>
    </div>
  );
}

function TypeEditor({ value, onSaved, onDeleted }) {
  const [t, setT] = useState(value);
  const [busy,setBusy]=useState(false);
  const requestId=useRef(crypto.randomUUID());
  useEffect(() => {
    setT(value);requestId.current=crypto.randomUUID();
  }, [value]);
  const set = (patch) => setT({ ...t, ...patch });
  const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

  const save = async () => {
    if(busy)return;setBusy(true);
    const body = { ...t, request_id:requestId.current, expected_revision:t.revision, tasp_min: numOrNull(t.tasp_min), tasp_max: numOrNull(t.tasp_max),
      subjects: t.subjects.map((s) => ({ ...s, key: s.key || slug(s.name), question_count: Number(s.question_count) || 0,
        coefficient: Number(s.coefficient) || 0, mean: Number(s.mean) || 0, sd: Number(s.sd) || 1 })) };
    try {
      const r = t.id ? await api.put(`/exam-types/${t.id}`, body) : await api.post("/exam-types", body);
      toast.success("Sınav türü kaydedildi");
      onSaved(r.data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {setBusy(false);}
  };

  const remove = async () => {
    if (!window.confirm("Bu sınav türü silinsin mi?")) return;
    try {
      await api.delete(`/exam-types/${t.id}`, {data:{expected_revision:t.revision}});
      toast.success("Silindi");
      onDeleted();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Panel title={t.id ? t.name : "Yeni Sınav Türü"} testId="exam-type-editor"
      actions={<div className="flex gap-2">
        {t.id && !t.is_default && <Button variant="outline" size="sm" onClick={remove} data-testid="exam-type-delete-button"><Trash2 className="mr-1 h-4 w-4" />Sil</Button>}
        <Button size="sm" className="bg-red-600 hover:bg-red-700" disabled={busy} onClick={save} data-testid="exam-type-save-button"><Save className="mr-1 h-4 w-4" />Kaydet</Button>
      </div>}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-1"><Label>Ad</Label><Input value={t.name} onChange={(e) => set({ name: e.target.value })} data-testid="exam-type-name-input" /></div>
        <div className="space-y-1.5"><Label>Taban Puan</Label><Input type="number" className="font-mono" value={t.base_score} onChange={(e) => set({ base_score: Number(e.target.value) })} data-testid="exam-type-base-input" /></div>
        <div className="space-y-1.5"><Label>Tavan Puan</Label><Input type="number" className="font-mono" value={t.max_score} onChange={(e) => set({ max_score: Number(e.target.value) })} data-testid="exam-type-max-input" /></div>
        <div className="space-y-1.5">
          <Label>Varsayılan Yanlış Kuralı</Label>
          <Select value={String(t.default_penalty)} onValueChange={(v) => set({ default_penalty: Number(v) })}>
            <SelectTrigger data-testid="exam-type-penalty-select"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">{PENALTIES.map((p) => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>En Küçük TASP (opsiyonel)</Label><Input type="number" className="font-mono" placeholder="Otomatik" value={t.tasp_min ?? ""} onChange={(e) => set({ tasp_min: e.target.value })} data-testid="exam-type-tasp-min-input" /></div>
        <div className="space-y-1.5"><Label>En Büyük TASP (opsiyonel)</Label><Input type="number" className="font-mono" placeholder="Otomatik" value={t.tasp_max ?? ""} onChange={(e) => set({ tasp_max: e.target.value })} data-testid="exam-type-tasp-max-input" /></div>
        <div className="space-y-1.5">
          <Label>Ortalama / Standart Sapma Kaynağı</Label>
          <Select value={t.sd_source || "manual"} onValueChange={(v) => set({ sd_source: v })}>
            <SelectTrigger data-testid="exam-type-sd-source-select"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="manual">Elle girilen değerler (ör. LGS)</SelectItem>
              <SelectItem value="exam">Sınavın kendi öğrencilerinden hesapla</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2"><Label>Açıklama</Label><Input value={t.description} onChange={(e) => set({ description: e.target.value })} data-testid="exam-type-description-input" /></div>
      </div>
      <div className="mt-6"><SubjectsTable subjects={t.subjects} onChange={(subjects) => set({ subjects })} /></div>
    </Panel>
  );
}

function FormulaInfo() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 text-sm text-slate-700" data-testid="formula-info">
      <div className="mb-2 flex items-center gap-2 font-semibold text-blue-900"><Info className="h-4 w-4" />Puan Hesaplama</div>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Net</b> = Doğru − Yanlış ÷ (3 veya 4)</li>
        <li><b>Standart sapmasız puan</b> = Taban + (Tavan − Taban) × Σ(katsayı × net) ÷ Σ(katsayı × soru)</li>
        <li><b>Standart puan (SP)</b> = 50 + 10 × (net − ortalama) ÷ standart sapma; <b>TASP</b> = Σ(katsayı × SP)</li>
        <li><b>Standart sapmalı puan</b> = Taban + (Tavan − Taban) × (TASP − en küçük TASP) ÷ (en büyük TASP − en küçük TASP). En küçük/büyük TASP boş bırakılırsa 0 net ve tam net üzerinden hesaplanır.</li>
      </ul>
    </div>
  );
}

export default function ExamTypes() {
  const [types, setTypes] = useState(null);
  const [selected, setSelected] = useState(null);
  const load = (pick) => api.get("/exam-types").then((r) => {
    setTypes(r.data);
    setSelected(r.data.find((t) => t.id === pick) || r.data[0] || EMPTY);
  }).catch(loadError);

  useEffect(() => {
    load();
  }, []);

  if (!types) return <Loading />;
  return (
    <div>
      <PageHeader eyebrow="Ayarlar" title="Sınav Türü & Standart Sapma"
        description="Ders yapısı, katsayılar, ortalama ve standart sapma değerleri. LGS 2026 varsayılan olarak tanımlıdır; değerleri buradan güncelleyebilirsiniz."
        actions={<Button variant="outline" onClick={() => setSelected({ ...EMPTY })} data-testid="exam-type-new-button"><Plus className="mr-1 h-4 w-4" />Yeni Sınav Türü</Button>} />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
          {types.map((t) => (
            <button key={t.id} onClick={() => setSelected(t)} data-testid={`exam-type-item-${t.id}`}
              className={`rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors ${selected?.id === t.id ? "border-red-600 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
              {t.name}<div className="text-xs font-normal text-slate-500">{t.subjects.length} ders · taban {t.base_score}</div>
            </button>
          ))}
        </div>
        <div className="space-y-6">
          {selected && <TypeEditor value={selected} onSaved={(t) => load(t.id)} onDeleted={() => load()} />}
          <FormulaInfo />
        </div>
      </div>
    </div>
  );
}
