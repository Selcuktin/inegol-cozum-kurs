import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MappingEditor({ subjects, answerFields, mapping, onChange, sample }) {
  const set = (key, patch) => onChange({ ...mapping, [key]: { field_index: 0, start: 1, ...mapping[key], ...patch } });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-2">Ders</th><th>Optik Alanı</th><th>Başlangıç Sorusu</th><th>Örnek Okuma</th></tr></thead>
        <tbody>
          {subjects.map((s) => {
            const m = mapping[s.key];
            const raw = m && sample ? (sample.answers[String(m.field_index)] || "") : "";
            const part = m ? raw.slice(m.start - 1, m.start - 1 + s.question_count) : "";
            return (
              <tr key={s.key} className="border-b border-slate-100" data-testid={`mapping-row-${s.key}`}>
                <td className="py-2 pr-3 font-medium">{s.name} <span className="text-xs text-slate-400">({s.question_count})</span></td>
                <td className="pr-3">
                  <Select value={m ? String(m.field_index) : ""} onValueChange={(v) => set(s.key, { field_index: Number(v) })}>
                    <SelectTrigger className={`h-9 w-48 ${m ? "" : "border-amber-400"}`} data-testid={`mapping-field-${s.key}`}><SelectValue placeholder="Alan seçin" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {answerFields.map((f) => <SelectItem key={f.index} value={String(f.index)}>{f.name} ({f.length})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="pr-3"><Input type="number" min={1} className="h-9 w-20 font-mono" value={m?.start ?? 1} onChange={(e) => set(s.key, { start: Math.max(1, Number(e.target.value)) })} data-testid={`mapping-start-${s.key}`} /></td>
                <td className="font-mono text-xs tracking-widest text-slate-600">{part.replace(/ /g, "·") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
