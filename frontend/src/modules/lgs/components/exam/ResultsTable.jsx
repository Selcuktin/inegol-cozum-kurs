import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { num, subjectColor } from "@/modules/lgs/api";

export function ResultsTable({ exam, results }) {
  const navigate = useNavigate();
  const [page,setPage]=useState(0);
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("all");
  useEffect(()=>setPage(0),[q,branch,results]);
  const subjects = exam.exam_type.subjects;
  const branches = useMemo(() => [...new Set(results.map((r) => r.branch))].sort(), [results]);
  const rows = results.filter((r) => (branch === "all" || r.branch === branch)
    && (!q || r.name.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")) || r.student_no.includes(q)));

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad veya numara ara" className="pl-9" data-testid="results-search-input" />
        </div>
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="w-full sm:w-48" data-testid="results-branch-filter"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Tüm şubeler</SelectItem>
            {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-500 sm:ml-auto" data-testid="results-count">{rows.length} öğrenci</span>
      </div>
      <div className="max-h-[70vh] overflow-x-auto overflow-y-auto overscroll-x-contain">
        <table className="w-full min-w-[750px] whitespace-nowrap text-sm" data-testid="results-table">
          <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="sticky left-0 z-30 bg-slate-50 p-2 text-left" rowSpan={2}>Sıra</th>
              <th className="sticky left-10 z-30 bg-slate-50 p-2 text-left shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" rowSpan={2}>Ad Soyad</th>
              <th className="p-2 text-left" rowSpan={2}>No</th>
              <th className="p-2 text-left" rowSpan={2}>Şube</th>
              <th className="p-2 text-center" rowSpan={2}>Kit.</th>
              {subjects.map((s, i) => (
                <th key={s.key} colSpan={3} className="border-l border-slate-200 p-1 text-center font-bold" style={{ color: subjectColor(s.key, i) }}>
                  {s.name}
                </th>
              ))}
              <th className="border-l border-slate-200 p-2 text-right" rowSpan={2}>Net</th>
              <th className="p-2 text-right" rowSpan={2}>Puan<br /><span className="normal-case">SS'siz</span></th>
              <th className="p-2 text-right text-red-600" rowSpan={2}>Puan<br /><span className="normal-case">SS'li</span></th>
            </tr>
            <tr>
              {subjects.map((s) => ["D", "Y", "N"].map((h) => (
                <th key={s.key + h} className={`px-1.5 py-1 text-center ${h === "D" ? "border-l border-slate-200" : ""}`}>{h}</th>
              )))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.slice(page*50,(page+1)*50).map((r) => (
              <tr key={r.id} onClick={() => navigate(`/sinav/${exam.id}/ogrenci/${r.id}`)} className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-red-50/40" data-testid={`result-row-${r.id}`}>
                <td className="sticky left-0 z-10 bg-white p-2 font-semibold">{r.rank}</td>
                <td className="sticky left-10 z-10 bg-white p-2 font-sans font-medium text-slate-900"><button onClick={e=>{e.stopPropagation();navigate(`/sinav/${exam.id}/ogrenci/${r.id}`);}} className="text-left underline-offset-2 hover:underline">{r.name}</button></td>
                <td className="p-2 text-slate-500">{r.student_no || "-"}</td>
                <td className="p-2 font-sans">{r.branch}</td>
                <td className="p-2 text-center">{r.booklet}</td>
                {subjects.map((s) => {
                  const x = r.subjects[s.key] || { d: 0, y: 0, net: 0 };
                  return [
                    <td key={`${s.key}-d`} className="border-l border-slate-100 px-1.5 text-center text-emerald-700">{x.d}</td>,
                    <td key={`${s.key}-y`} className="px-1.5 text-center text-red-600">{x.y}</td>,
                    <td key={`${s.key}-n`} className="px-1.5 text-center font-semibold">{num(x.net)}</td>,
                  ];
                })}
                <td className="border-l border-slate-100 p-2 text-right font-semibold">{num(r.total_net)}</td>
                <td className="p-2 text-right">{num(r.score_raw, 3)}</td>
                <td className="p-2 text-right font-bold text-red-600" data-testid={`result-score-sd-${r.id}`}>{num(r.score_sd, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length>50&&<nav aria-label="Sonuç sayfaları" className="flex items-center justify-between gap-2 p-4 text-sm"><button disabled={page===0} onClick={()=>setPage(page-1)}>Önceki</button><span>{page+1} / {Math.ceil(rows.length/50)}</span><button disabled={(page+1)*50>=rows.length} onClick={()=>setPage(page+1)}>Sonraki</button></nav>}
    </div>
  );
}
