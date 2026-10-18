import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading, StatCard } from "@/modules/lgs/components/common";
import { API, num, subjectColor } from "@/modules/lgs/api";
import axios from "axios";

export default function VeliKarne() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/public/karne/${token}`).then((r) => setData(r.data)).catch(() => setError("Karne bulunamadı veya bağlantı geçersiz."));
  }, [token]);

  if (error) return <div className="p-10 text-center text-sm text-red-600" data-testid="veli-error">{error}</div>;
  if (!data) return <Loading />;
  const { result: r, exam, analysis } = data;
  const avg = Object.fromEntries(analysis.subjects.map((s) => [s.key, s.avg_net]));
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8" data-testid="veli-karne">
        <div className="rise flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <img src="/assets/logo.jpeg" alt="İnegöl Çözüm Kurs" className="h-20 w-16 object-contain" />
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Deneme Karnesi</div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="veli-student-name">{r.name}</h1>
            <div className="text-sm text-slate-500">{exam.name} · {exam.date} · {r.branch}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Puan (SS'li)" value={num(r.score_sd)} hint={`Kurum ort. ${num(analysis.avg_sd)}`} testId="veli-score-sd" />
          <StatCard label="Puan (SS'siz)" value={num(r.score_raw)} hint={`Kurum ort. ${num(analysis.avg_raw)}`} accent="blue" />
          <StatCard label="Genel Sıra" value={`${r.rank}/${analysis.count}`} hint={`Şube sırası ${r.branch_rank}`} accent="green" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <table className="w-full min-w-[460px] text-xs sm:text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-slate-500 [&>th]:px-2"><th className="py-2">Ders</th><th className="text-right">D</th><th className="text-right">Y</th><th className="text-right">B</th><th className="text-right">Net</th><th className="text-right">Kurum Ort.</th></tr></thead>
            <tbody className="font-mono">{exam.subjects.map((s, i) => {
              const x = r.subjects[s.key];
              return (
                <tr key={s.key} className="border-b border-slate-100 [&>td]:px-2">
                  <td className="py-2 font-sans font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(s.key, i) }} />{s.name}</td>
                  <td className="text-right text-emerald-700">{x.d}</td><td className="text-right text-red-600">{x.y}</td><td className="text-right">{x.b}</td>
                  <td className="text-right font-bold">{num(x.net)}</td><td className="text-right text-slate-500">{num(avg[s.key])}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {r.ai_comment && <div className="ai-text prose prose-sm max-w-none rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="whitespace-pre-wrap">{r.ai_comment}</div></div>}
        <Button asChild className="w-full bg-red-600 hover:bg-red-700" data-testid="veli-pdf-button">
          <a href={`${API}/public/karne/${token}/pdf`}><FileDown className="mr-2 h-4 w-4" />Karneyi PDF İndir</a>
        </Button>
        <p className="text-center font-display text-sm font-semibold text-red-600">İnegöl Çözüm Kurs · Problem Yok, Çözüm Var!</p>
      </div>
    </div>
  );
}
