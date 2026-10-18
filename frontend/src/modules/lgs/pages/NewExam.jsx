import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, FileUp, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, PageHeader, Panel } from "@/modules/lgs/components/common";
import { AnswerKeyEditor, keysFromRow } from "@/modules/lgs/components/exam/AnswerKeyEditor";
import { MappingEditor } from "@/modules/lgs/components/exam/MappingEditor";
import { PENALTIES, api, loadError, errMsg } from "@/modules/lgs/api";

const STEPS = ["Sınav Bilgileri", "Optik Veri Dosyası", "Cevap Anahtarı"];

function Stepper({ step }) {
  return (
    <div className="mb-8 flex flex-wrap gap-2" data-testid="wizard-stepper">
      {STEPS.map((s, i) => (
        <div key={s} className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${i === step ? "border-red-600 bg-red-600 text-white" : i < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
          {i < step ? <Check className="h-4 w-4" /> : <span className="font-mono">{i + 1}</span>}{s}
        </div>
      ))}
    </div>
  );
}

export function PenaltyPicker({ value, onChange }) {
  return (
    <RadioGroup value={String(value)} onValueChange={(v) => onChange(Number(v))} className="grid gap-2 sm:grid-cols-3" data-testid="exam-penalty-select">
      {PENALTIES.map((p) => (
        <label key={p.value} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${value === p.value ? "border-blue-700 bg-blue-50" : "border-slate-200 bg-white"}`}>
          <RadioGroupItem value={String(p.value)} data-testid={`penalty-option-${p.value}`} />{p.label}
        </label>
      ))}
    </RadioGroup>
  );
}

function StepInfo({ form, set, types, templates }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-1.5"><Label>Sınav Adı</Label><Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="ör. LGS Deneme 3" data-testid="exam-name-input" /></div>
      <div className="space-y-1.5"><Label>Tarih</Label><Input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} data-testid="exam-date-input" /></div>
      <div className="space-y-1.5">
        <Label>Sınav Türü</Label>
        <Select value={form.exam_type_id} onValueChange={(v) => set({ exam_type_id: v, penalty: types.find((t) => t.id === v)?.default_penalty ?? 3 })}>
          <SelectTrigger data-testid="exam-type-select"><SelectValue placeholder="Seçin" /></SelectTrigger>
          <SelectContent className="bg-white">{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>FMT Şablonu</Label>
        <Select value={form.template_id} onValueChange={(v) => set({ template_id: v })}>
          <SelectTrigger data-testid="exam-template-select"><SelectValue placeholder="Seçin" /></SelectTrigger>
          <SelectContent className="max-h-80 bg-white">{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 md:col-span-2"><Label>Yanlış Kuralı</Label><PenaltyPicker value={form.penalty} onChange={(penalty) => set({ penalty })} /></div>
    </div>
  );
}

function PreviewTable({ parsed }) {
  return (
    <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[400px] text-sm">
        <thead className="sticky top-0 bg-slate-50"><tr className="text-left text-xs uppercase text-slate-500"><th className="p-2">Satır</th><th className="p-2">No</th><th className="p-2">Ad Soyad</th><th className="p-2">Sınıf/Şube</th><th className="p-2">Kit.</th></tr></thead>
        <tbody>
          {parsed.students.slice(0, 50).map((s) => (
            <tr key={s.line_no} className={`border-t border-slate-100 ${s.is_key ? "bg-amber-50" : ""}`}>
              <td className="p-2 font-mono text-xs text-slate-400">{s.line_no}</td><td className="p-2 font-mono">{s.student_no}</td>
              <td className="p-2">{s.name || <span className="text-slate-400">—</span>}{s.is_key && <span className="ml-2 text-xs font-semibold text-amber-700">CEVAP ANAHTARI</span>}</td>
              <td className="p-2">{[s.sinif, s.sube].filter(Boolean).join(" ")}</td><td className="p-2 font-mono">{s.booklet}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepFile({ parsed, onFile, busy, subjects, mapping, setMapping }) {
  const input = useRef(null);
  const sample = parsed?.students.find((s) => !s.is_key);
  return (
    <div className="space-y-6">
      <input ref={input} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="data-file-input" />
      <button onClick={() => input.current.click()} className="grid-paper flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-10 text-slate-600 transition-colors hover:border-red-400" data-testid="data-file-dropzone">
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-red-600" /> : <FileUp className="h-8 w-8 text-red-600" />}
        <span className="font-semibold">{parsed ? parsed.file_name : "Optik okuyucu veri dosyasını seçin"}</span>
        <span className="text-xs">.txt / .dat / .fmt — okuyucunun seçilen şablonla ürettiği çıktı dosyası</span>
      </button>
      <a href="/ornek-lgs-verisi.txt" download className="inline-block text-xs font-medium text-blue-800 hover:underline" data-testid="sample-data-link">
        Örnek LGS veri dosyasını indir ("PRONET LGS (2020) SÖZ-SAY SEKONIC_d9c2" şablonu ile)
      </a>
      {parsed && (
        <>
          <div className="flex flex-wrap gap-3 text-sm" data-testid="parse-summary">
            <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-800">{parsed.total} satır okundu</span>
            <span className="rounded bg-slate-100 px-2 py-1">Kitapçıklar: {parsed.booklets.join(", ") || "A"}</span>
            {parsed.key_rows.length > 0 && <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">{parsed.key_rows.length} cevap anahtarı satırı bulundu</span>}
          </div>
          <PreviewTable parsed={parsed} />
          <div><h4 className="mb-2 font-semibold">Ders – Optik Alan Eşleştirmesi</h4>
            <MappingEditor subjects={subjects} answerFields={parsed.answer_fields} mapping={mapping} onChange={setMapping} sample={sample} /></div>
        </>
      )}
    </div>
  );
}

export default function NewExam() {
  const navigate = useNavigate();
  const requestId=useRef(crypto.randomUUID());
  const [types, setTypes] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", date: new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul"}).format(new Date()), exam_type_id: "", template_id: "", penalty: 3 });
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [keys, setKeys] = useState({ A: {} });
  const [maps, setMaps] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (p) => {if(p.template_id||p.exam_type_id){setParsed(null);setMapping({});setKeys({A:{}});setMaps({});}setForm({ ...form, ...p });};

  useEffect(() => {
    Promise.all([api.get("/exam-types"), api.get("/templates")]).then(([a, b]) => {
      setTypes(a.data);
      setTemplates(b.data);
      const def = a.data.find((t) => t.is_default) || a.data[0];
      if (def) setForm((f) => ({ ...f, exam_type_id: def.id, penalty: def.default_penalty }));
    }).catch(loadError);
  }, []);

  if (!types) return <Loading />;
  const type = types.find((t) => t.id === form.exam_type_id);
  const subjects = type?.subjects || [];

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("template_id", form.template_id);
    fd.append("exam_type_id", form.exam_type_id);
    try {
      const r = await api.post("/parse", fd);
      setParsed(r.data);
      setMapping(r.data.mapping);
      const next = {};
      (r.data.booklets.length ? r.data.booklets : ["A"]).forEach((b) => { next[b] = {}; });
      r.data.key_rows.forEach((row) => { next[row.booklet] = keysFromRow(row, subjects, r.data.mapping); });
      setKeys(next);
      toast.success(`${r.data.total} satır okundu`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const canNext = step === 0 ? form.name && form.exam_type_id && form.template_id : step === 1 ? parsed && subjects.every((s) => mapping[s.key]) : true;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post("/exams", { ...form, request_id:requestId.current, mapping, answer_keys: keys, booklet_maps: maps, raw_text: parsed.text, file_name: parsed.file_name });
      toast.success("Sınav okundu ve puanlar hesaplandı");
      navigate(`/sinav/${r.data.id}`);
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Okuma Sihirbazı" title="Yeni Sınav Oku" description="Şablonu seçin, optik veri dosyasını yükleyin, cevap anahtarını girin; puanlar iki türde hesaplansın." />
      <Stepper step={step} />
      <Panel testId={`wizard-step-${step}`}>
        {step === 0 && <StepInfo form={form} set={set} types={types} templates={templates} />}
        {step === 1 && <StepFile parsed={parsed} onFile={onFile} busy={busy} subjects={subjects} mapping={mapping} setMapping={setMapping} />}
        {step === 2 && (
          <div className="space-y-4">
            {parsed?.key_rows.length > 0 && <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"><Wand2 className="h-4 w-4" />Cevap anahtarı veri dosyasından otomatik dolduruldu. Kontrol edin.</div>}
            <AnswerKeyEditor subjects={subjects} booklets={Object.keys(keys)} value={keys} onChange={setKeys} maps={maps} onMapsChange={setMaps} />
          </div>
        )}
        <div className="mt-8 flex justify-between border-t border-slate-200 pt-5">
          <Button variant="outline" disabled={step === 0 || busy} onClick={() => setStep(step - 1)} data-testid="wizard-back-button">Geri</Button>
          {step < 2 ? (
            <Button className="bg-blue-800 hover:bg-blue-900" disabled={!canNext || busy} onClick={() => setStep(step + 1)} data-testid="wizard-next-button">İleri</Button>
          ) : (
            <Button className="bg-red-600 hover:bg-red-700" disabled={busy} onClick={submit} data-testid="calculate-scores-button">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Puanları Hesapla
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
