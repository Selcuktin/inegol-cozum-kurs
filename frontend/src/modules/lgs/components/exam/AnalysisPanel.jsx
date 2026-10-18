import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, StatCard } from "@/modules/lgs/components/common";
import { AiStream } from "@/modules/lgs/components/exam/AiStream";
import { download, errMsg, num, subjectColor } from "@/modules/lgs/api";

function SubjectChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v, n) => [num(v), n === "success_pct" ? "Başarı %" : "Ort. Net"]} />
        <Bar dataKey="success_pct" radius={[4, 4, 0, 0]}>
          {data.map((s, i) => <Cell key={s.key} fill={subjectColor(s.key, i)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Histogram({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [v, "Öğrenci"]} />
        <Bar dataKey="count" fill="#1E40AF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SubjectTable({ subjects }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm" data-testid="subject-stats-table">
      <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-2">Ders</th><th className="text-right">Soru</th><th className="text-right">Ort. D</th><th className="text-right">Ort. Y</th><th className="text-right">Ort. B</th><th className="text-right">Ort. Net</th><th className="text-right">En Yüksek</th><th className="text-right">Std. Sapma</th><th className="text-right">Başarı</th></tr></thead>
      <tbody className="font-mono">
        {subjects.map((s, i) => (
          <tr key={s.key} className="border-b border-slate-100">
            <td className="py-2 font-sans font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(s.key, i) }} />{s.name}</td>
            <td className="text-right">{s.question_count}</td><td className="text-right text-emerald-700">{num(s.avg_d)}</td>
            <td className="text-right text-red-600">{num(s.avg_y)}</td><td className="text-right text-slate-500">{num(s.avg_b)}</td>
            <td className="text-right font-semibold">{num(s.avg_net)}</td><td className="text-right">{num(s.max_net)}</td>
            <td className="text-right">{num(s.sd_net)}</td><td className="text-right">%{num(s.success_pct, 1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function BranchPdf({ examId, branch }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await download(`/exams/${examId}/export/sube-karneleri?branch=${encodeURIComponent(branch)}`, `sube_karnesi_${branch.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={run} disabled={busy} title="Şube karnesi PDF" className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-sans text-xs font-medium text-blue-800 hover:bg-blue-50" data-testid={`branch-pdf-${branch}`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}PDF
    </button>
  );
}

function BranchTable({ examId, branches, subjects }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] whitespace-nowrap text-sm" data-testid="branch-stats-table">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500 [&>th]:px-2"><th className="py-2">Şube</th><th className="text-right">Öğr.</th>{subjects.map((s) => <th key={s.key} className="text-right">{s.name}</th>)}<th className="text-right">Net</th><th className="text-right">SS'siz</th><th className="text-right">SS'li</th><th /></tr></thead>
        <tbody className="font-mono">
          {branches.map((b) => (
            <tr key={b.branch} className="border-b border-slate-100 [&>td]:px-2">
              <td className="py-2 font-sans font-medium">{b.branch}</td><td className="text-right">{b.count}</td>
              {subjects.map((s) => <td key={s.key} className="px-2 text-right">{num(b.nets[s.key])}</td>)}
              <td className="text-right font-semibold">{num(b.avg_net)}</td><td className="text-right">{num(b.avg_raw)}</td><td className="text-right font-semibold text-red-600">{num(b.avg_sd)}</td>
              <td className="text-right"><BranchPdf examId={examId} branch={b.branch} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalysisPanel({ exam, analysis }) {
  if (!analysis.count) return <div className="py-10 text-sm text-slate-500">Bu sınavda sonuç yok.</div>;
  return (
    <div className="space-y-6" data-testid="analysis-panel">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Öğrenci" value={analysis.count} testId="analysis-count" />
        <StatCard label="Ort. Puan (SS'li)" value={num(analysis.avg_sd)} hint={`En yüksek ${num(analysis.max_sd)}`} testId="analysis-avg-sd" delay={50} />
        <StatCard label="Ort. Puan (SS'siz)" value={num(analysis.avg_raw)} hint={`En yüksek ${num(analysis.max_raw)}`} accent="blue" testId="analysis-avg-raw" delay={100} />
        <StatCard label="Ort. Toplam Net" value={num(analysis.avg_total_net)} accent="green" testId="analysis-avg-net" delay={150} />
        <StatCard label="Puan Std. Sapması" value={num(analysis.std_sd)} accent="amber" testId="analysis-std" delay={200} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Ders Bazlı Başarı (%)"><SubjectChart data={analysis.subjects} /></Panel>
        <Panel title="Puan Dağılımı (SS'li)"><Histogram data={analysis.histogram} /></Panel>
      </div>
      <Panel title="Ders Analizi"><div className="overflow-x-auto"><SubjectTable subjects={analysis.subjects} /></div></Panel>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Şube Karşılaştırması"><BranchTable examId={exam.id} branches={analysis.branches} subjects={exam.exam_type.subjects} /></Panel>
        <Panel title="İlk 10" testId="top-students">
          <ol className="space-y-2">
            {analysis.top.map((t) => (
              <li key={t.rank} className="flex items-center gap-3 text-sm">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold ${t.rank <= 3 ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"}`}>{t.rank}</span>
                <span className="flex-1 truncate font-medium">{t.name}<span className="ml-2 text-xs text-slate-400">{t.branch}</span></span>
                <span className="font-mono font-semibold text-red-600">{num(t.score_sd)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <AiStream path={`/exams/${exam.id}/ai-analysis`} initial={exam.ai_analysis} title="Yapay Zeka Deneme Analizi" testId="ai-analysis" />
    </div>
  );
}
