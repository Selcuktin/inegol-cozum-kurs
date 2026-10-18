import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { num } from "@/modules/lgs/api";

const OPTS = ["A", "B", "C", "D", "E"];

function QuestionRow({ row, total }) {
  const pctColor = row.correct_pct >= 60 ? "bg-emerald-600" : row.correct_pct >= 35 ? "bg-amber-500" : "bg-red-600";
  return (
    <tr className="border-t border-slate-100" data-testid={`question-row-${row.q}`}>
      <td className="p-2 font-mono font-semibold">{row.q}</td>
      <td className="p-2 text-center"><span className="rounded bg-blue-800 px-2 py-0.5 font-mono text-xs font-bold text-white">{row.key.trim() || "-"}</span></td>
      {OPTS.map((o) => (
        <td key={o} className={`p-2 text-center font-mono text-xs ${o === row.key ? "font-bold text-emerald-700" : "text-slate-600"}`}>
          {row.counts[o]}<span className="ml-1 text-[10px] text-slate-400">%{total ? Math.round((100 * row.counts[o]) / total) : 0}</span>
        </td>
      ))}
      <td className="p-2 text-center font-mono text-xs text-slate-500">{row.blank}</td>
      <td className="p-2 text-center font-mono text-xs text-slate-500">{row.multi}</td>
      <td className="w-56 p-2">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100"><div className={`h-full ${pctColor}`} style={{ width: `${row.correct_pct}%` }} /></div>
          <span className="w-12 text-right font-mono text-xs font-semibold">%{num(row.correct_pct, 1)}</span>
        </div>
      </td>
    </tr>
  );
}

export function QuestionAnalysis({ exam, analysis }) {
  const booklets = Object.keys(analysis.questions || {});
  const [booklet, setBooklet] = useState(booklets[0] || "A");
  const [subject, setSubject] = useState(exam.exam_type.subjects[0]?.key);
  const data = analysis.questions?.[booklet];
  const rows = data?.subjects?.[subject] || [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm" data-testid="question-analysis">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
        <Select value={booklet} onValueChange={setBooklet}>
          <SelectTrigger className="w-full sm:w-40" data-testid="qa-booklet-select"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">{booklets.map((b) => <SelectItem key={b} value={b}>{b === "TUM" ? "Tümü (A sırası)" : `${b} Kitapçığı`}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {exam.exam_type.subjects.map((s) => (
            <button key={s.key} onClick={() => setSubject(s.key)} data-testid={`qa-subject-${s.key}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${subject === s.key ? "border-red-600 bg-red-600 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{s.name}</button>
          ))}
        </div>
        <span className="text-xs text-slate-500 sm:ml-auto">{data?.count || 0} öğrenci</span>
      </div>
      {booklet === "TUM" && data?.unmapped?.[subject]?.length > 0 && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800" data-testid="qa-unmapped-warning">
          Bu ders için {data.unmapped[subject].join(", ")} kitapçığı soru eşleştirmesi girilmedi; birleşik analize dahil edilmedi. Ayarlar sekmesinden eşleştirme girebilirsiniz.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2 text-left">Soru</th><th className="p-2">Cevap</th>{OPTS.map((o) => <th key={o} className="p-2">{o}</th>)}<th className="p-2">Boş</th><th className="p-2">Çoklu</th><th className="p-2 text-left">Doğru Oranı</th></tr></thead>
          <tbody>{rows.map((r) => <QuestionRow key={r.q} row={r} total={r.count ?? data.count} />)}</tbody>
        </table>
      </div>
    </div>
  );
}
