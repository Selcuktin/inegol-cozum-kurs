import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loading, Panel, StatCard } from "@/modules/lgs/components/common";
import { AiStream } from "@/modules/lgs/components/exam/AiStream";
import { ProgressPanel } from "@/modules/lgs/components/exam/ProgressPanel";
import { SharePanel } from "@/modules/lgs/components/exam/SharePanel";
import { api, loadError, download, errMsg, num, subjectColor } from "@/modules/lgs/api";

function AnswerStrip({ answers, answerKey }) {
  return (
    <div className="flex flex-wrap gap-1">
      {answers.split("").map((a, i) => {
        const k = answerKey[i];
        const ok = a === k && k !== " ";
        const cls = (ok || k === "X" || k === "*") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : a === " " || k === " " ? "border-slate-200 bg-white text-slate-300" : "border-red-200 bg-red-50 text-red-700";
        return (
          <div key={i} title={`Soru ${i + 1} · Cevap: ${k}`} className={`flex h-9 w-7 flex-col items-center justify-center rounded border font-mono text-[11px] leading-none ${cls}`}>
            <span className="text-[9px] text-slate-400">{i + 1}</span><span className="font-bold">{a === " " ? "–" : a}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentKarne() {
  const { eid, rid } = useParams();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setData(null);
    api.get(`/results/${rid}/bundle`).then(r=>{if(r.data.exam.id!==eid)throw new Error('Karne bu sınava ait değil.');setData(r.data);}).catch(loadError);
  }, [eid, rid]);

  if (!data) return <Loading />;
  const { exam, r, analysis } = data;
  const subjects = exam.exam_type.subjects;
  const avg = Object.fromEntries(analysis.subjects.map((s) => [s.key, s]));
  const radar = subjects.map((s) => ({ name: s.name, ogrenci: Math.max(0, (100 * r.subjects[s.key].net) / s.question_count), kurum: avg[s.key]?.success_pct || 0 }));

  const pdf = async () => {
    setBusy(true);
    try {
      await download(`/results/${rid}/karne`, `karne_${r.name.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="student-karne">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/sinav/${eid}`} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900" data-testid="karne-back-link"><ArrowLeft className="h-4 w-4" />{exam.name}</Link>
        <Button className="bg-red-600 hover:bg-red-700" onClick={pdf} disabled={busy} data-testid="karne-pdf-button">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}Karne PDF</Button>
      </div>
      <div className="rise flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <img src="/assets/logo.jpeg" alt="" className="h-24 w-20 object-contain" />
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Öğrenci Deneme Karnesi</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl" data-testid="karne-student-name">{r.name}</h1>
          <div className="mt-1 text-sm text-slate-500">No: {r.student_no || "-"} · {r.branch} · Kitapçık {r.booklet} · {exam.date}</div>
        </div>
        <div className="flex gap-6 text-center">
          <div><div className="text-xs uppercase text-slate-500">Genel Sıra</div><div className="font-display text-3xl font-bold text-blue-800" data-testid="karne-rank">{r.rank}<span className="text-base text-slate-400">/{analysis.count}</span></div></div>
          <div><div className="text-xs uppercase text-slate-500">Şube Sırası</div><div className="font-display text-3xl font-bold text-blue-800">{r.branch_rank}</div></div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Puan (Standart Sapmalı)" value={num(r.score_sd, 3)} hint={`Kurum ort. ${num(analysis.avg_sd)}`} testId="karne-score-sd" />
        <StatCard label="Puan (Standart Sapmasız)" value={num(r.score_raw, 3)} hint={`Kurum ort. ${num(analysis.avg_raw)}`} accent="blue" testId="karne-score-raw" delay={60} />
        <StatCard label="Toplam Net" value={num(r.total_net)} hint={`Kurum ort. ${num(analysis.avg_total_net)}`} accent="green" testId="karne-total-net" delay={120} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Ders Sonuçları">
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-2">Ders</th><th className="text-right">D</th><th className="text-right">Y</th><th className="text-right">B</th><th className="text-right">Net</th><th className="text-right">Kurum Ort.</th></tr></thead>
            <tbody className="font-mono">{subjects.map((s, i) => {
              const x = r.subjects[s.key];
              const better = x.net >= (avg[s.key]?.avg_net || 0);
              return (
                <tr key={s.key} className="border-b border-slate-100">
                  <td className="py-2 font-sans font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(s.key, i) }} />{s.name}</td>
                  <td className="text-right text-emerald-700">{x.d}</td><td className="text-right text-red-600">{x.y}</td><td className="text-right text-slate-500">{x.b}</td>
                  <td className={`text-right font-bold ${better ? "text-emerald-700" : "text-red-600"}`}>{num(x.net)}</td><td className="text-right text-slate-500">{num(avg[s.key]?.avg_net)}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </Panel>
        <Panel title="Başarı Profili (%)">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar} outerRadius="62%">
              <PolarGrid stroke="#E2E8F0" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Öğrenci" dataKey="ogrenci" stroke="#D9231D" fill="#D9231D" fillOpacity={0.3} />
              <Radar name="Kurum" dataKey="kurum" stroke="#1E40AF" fill="#1E40AF" fillOpacity={0.12} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel title="Cevap Kağıdı">
        <div className="space-y-4">{subjects.map((s) => (
          <div key={s.key} data-testid={`answer-strip-${s.key}`}><div className="mb-1.5 text-sm font-semibold text-slate-700">{s.name}</div>
            <AnswerStrip answers={r.subjects[s.key].answers} answerKey={r.subjects[s.key].key} /></div>
        ))}</div>
      </Panel>
      <SharePanel rid={rid} result={r} exam={exam} />
      <ProgressPanel rid={rid} />
      <AiStream path={`/results/${rid}/ai-comment`} initial={r.ai_comment} title="Yapay Zeka Öğrenci Yorumu" testId="ai-student" />
    </div>
  );
}
