import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/modules/lgs/components/common";
import { AnswerKeyEditor } from "@/modules/lgs/components/exam/AnswerKeyEditor";
import { MappingEditor } from "@/modules/lgs/components/exam/MappingEditor";
import { PenaltyPicker } from "@/modules/lgs/pages/NewExam";
import { api, loadError, errMsg } from "@/modules/lgs/api";

export function ExamSettings({ exam, booklets, onSaved }) {
  const [penalty, setPenalty] = useState(exam.penalty);
  const [keys, setKeys] = useState(exam.answer_keys);
  const [mapping, setMapping] = useState(exam.mapping);
  const [maps, setMaps] = useState(exam.booklet_maps || {});
  const [busy, setBusy] = useState(false);
  const [types, setTypes] = useState([]);
  const [typeId, setTypeId] = useState(exam.exam_type_id);
  const current = types.find((t) => t.id === typeId);
  const subjects = current?.subjects || exam.exam_type.subjects;
  const unmapped = subjects.filter((s) => !mapping[s.key]);

  useEffect(() => {
    let current=true;
    api.get("/exam-types").then((r) => {if(current)setTypes(r.data);}).catch(e=>{if(current)loadError(e);});
    return()=>{current=false;};
  }, []);

  const changeType = (id, available=types) => {
    const t = available.find((x) => x.id === id);
    if (!t) return;
    const counts = Object.fromEntries(t.subjects.map((s) => [s.key, s.question_count]));
    setTypeId(id);
    setMapping(Object.fromEntries(Object.entries(mapping).filter(([k]) => counts[k])));
    setKeys(Object.fromEntries(Object.entries(keys).map(([b, ks]) => [b, Object.fromEntries(
      Object.entries(ks).filter(([k]) => counts[k]).map(([k, v]) => [k, v.slice(0, counts[k])]))])));
    setMaps(Object.fromEntries(Object.entries(maps).map(([b, ms]) => [b, Object.fromEntries(
      Object.entries(ms).filter(([k, m]) => counts[k] === m.length))])));
  };
  const answerFields = (exam.template_fields || []).map((f, index) => ({ index, name: f.name, length: f.length, role: f.role })).filter((f) => f.role === "cevap");
  const allBooklets = [...new Set([...Object.keys(keys), ...booklets])].sort();

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/exams/${exam.id}`, { expected_revision:exam.revision, name: exam.name, date: exam.date, exam_type_id: typeId, template_id: exam.template_id, penalty, mapping, answer_keys: keys, booklet_maps: maps });
      toast.success("Puanlar güncel ayarlarla yeniden hesaplandı");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="exam-settings">
      <Panel title="Sınav Türü">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={typeId} onValueChange={changeType}>
            <SelectTrigger className="w-80 max-w-full" data-testid="settings-exam-type-select"><SelectValue placeholder={exam.exam_type.name} /></SelectTrigger>
            <SelectContent className="bg-white">{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          {typeId !== exam.exam_type_id && <span className="text-xs font-medium text-amber-700" data-testid="settings-exam-type-changed">Tür değişti: cevap anahtarı ve eşleştirmeleri kontrol edip kaydedin.</span>}
        </div>
        <p className="mt-2 text-xs text-slate-500">Aynı dersler korunur; soru sayısı kısalan derslerde anahtar kısaltılır, yeni derslerin anahtarını ve optik alanını girin.</p>
      </Panel>
      <Panel title="Yanlış Kuralı"><PenaltyPicker value={penalty} onChange={setPenalty} /></Panel>
      <Panel title="Cevap Anahtarı"><AnswerKeyEditor key={typeId} subjects={subjects} booklets={allBooklets} value={keys} onChange={setKeys} maps={maps} onMapsChange={setMaps} /></Panel>
      <Panel title="Ders – Optik Alan Eşleştirmesi"><MappingEditor subjects={subjects} answerFields={answerFields} mapping={mapping} onChange={setMapping} /></Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500" data-testid="settings-footer-note">{unmapped.length ? `Optik alanı seçilmemiş ders: ${unmapped.map((s) => s.name).join(", ")}` : "Kaydettiğinizde sınav türündeki güncel ortalama / standart sapma değerleri de uygulanır."}</p>
        <Button className="w-full sm:w-auto bg-red-600 hover:bg-red-700" onClick={save} disabled={busy || unmapped.length > 0} data-testid="exam-recalculate-button">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Kaydet ve Yeniden Hesapla
        </Button>
      </div>
    </div>
  );
}
