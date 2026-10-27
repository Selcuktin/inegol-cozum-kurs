import { useState } from "react";
import { FileDown, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, StatCard } from "@/modules/lgs/components/common";
import { AiStream } from "@/modules/lgs/components/exam/AiStream";
import { download, errMsg, num, subjectColor } from "@/modules/lgs/api";
import { usePrintTarget } from "@/hooks/usePrintTarget";

function SubjectChart({ data, responses = false }) {
  const lowest = Math.min(0, ...data.map(s => s.success_pct));
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 52 + 55)}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: responses ? 14 : 44, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
        <XAxis type="number" domain={responses ? [0, "auto"] : [Math.floor(lowest / 10) * 10, 100]} tick={{ fontSize: 11 }} tickFormatter={v => responses ? num(v, 0) : `%${v}`} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={name => name.length > 18 ? `${name.slice(0, 17)}…` : name} />
        <Tooltip formatter={(value, name) => [responses ? num(value) : `%${num(value, 1)}`, name]} />
        {responses ? <>
          <Legend />
          <Bar dataKey="avg_d" name="Doğru" stackId="answers" fill="#047857" isAnimationActive={false} />
          <Bar dataKey="avg_y" name="Yanlış" stackId="answers" fill="#dc2626" isAnimationActive={false} />
          <Bar dataKey="avg_b" name="Boş" stackId="answers" fill="#94a3b8" radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </> : <>
          <ReferenceLine x={0} stroke="#94a3b8" />
          <Bar dataKey="success_pct" name="Net başarı oranı" radius={4} isAnimationActive={false}>
            {data.map((s, i) => <Cell key={s.key} fill={subjectColor(s.key, i)} />)}
            <LabelList dataKey="success_pct" position="right" formatter={v => `%${num(v, 1)}`} fontSize={11} fill="#334155" />
          </Bar>
        </>}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Histogram({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 10, left: -20, bottom: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="range" tick={{ fontSize: 10 }} minTickGap={12} angle={-35} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [v, "Öğrenci"]} />
        <Bar dataKey="count" name="Öğrenci" fill="#1E40AF" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          <LabelList dataKey="count" position="top" fontSize={11} formatter={v => v || ""} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function BranchChart({ analysis, examId }) {
  const [metric, setMetric] = useState("avg_net");
  const options = [{ key: "avg_net", label: "Toplam net", average: analysis.avg_total_net }, { key: "avg_sd", label: "Puan (SS’li)", average: analysis.avg_sd }, { key: "avg_raw", label: "Puan (SS’siz)", average: analysis.avg_raw }];
  const selected = options.find(o => o.key === metric);
  return <>
    <div role="group" aria-label="Şube karşılaştırma ölçüsü" className="analysis-metrics no-print">
      {options.map(o => <button key={o.key} type="button" aria-pressed={metric === o.key} onClick={() => setMetric(o.key)}>{o.label}</button>)}
    </div>
    <p className="mb-3 text-sm text-slate-600" aria-live="polite">{selected.label} · Kurum ortalaması: <strong>{num(selected.average)}</strong></p>
    <ResponsiveContainer width="100%" height={Math.max(220, analysis.branches.length * 46 + 40)}>
      <BarChart data={analysis.branches} layout="vertical" margin={{ top: 10, right: 55, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="branch" width={72} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip formatter={value => [num(value), selected.label]} labelFormatter={(label, payload) => `${label} · ${payload?.[0]?.payload.count || 0} öğrenci`} />
        <ReferenceLine x={selected.average} stroke="#dc2626" strokeDasharray="4 4" />
        <Bar dataKey={metric} name={selected.label} fill="#1E40AF" radius={4} isAnimationActive={false}>
          <LabelList dataKey={metric} position="right" formatter={v => num(v, 1)} fontSize={11} fill="#334155" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <p className="mt-2 text-xs text-slate-500">Mavi çubuk: şube ortalaması · Kesikli kırmızı çizgi: kurum ortalaması</p>
    <details className="analysis-details"><summary>Şube değerleri ve PDF karneleri</summary><BranchTable examId={examId} branches={analysis.branches} subjects={analysis.subjects} /></details>
  </>;
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
  const printRef = usePrintTarget(!!analysis.count);
  if (!analysis.count) return <div className="py-10 text-sm text-slate-500">Bu sınavda sonuç yok.</div>;
  return (
    <div ref={printRef} className="analysis-overview space-y-6" data-testid="analysis-panel">
      <div className="analysis-heading">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-600">Grafikli deneme analizi</p><h2 className="text-xl font-bold">{exam.name}</h2><p className="mt-1 text-sm text-slate-500">{exam.date} · {analysis.count} öğrenci · {analysis.branches.length} şube</p></div>
        <button type="button" className="analysis-print no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Yazdır / PDF Kaydet</button>
      </div>
      <div className="analysis-stats grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Öğrenci" value={analysis.count} testId="analysis-count" />
        <StatCard label="Ort. Puan (SS'li)" value={num(analysis.avg_sd)} hint={`En yüksek ${num(analysis.max_sd)}`} testId="analysis-avg-sd" delay={50} />
        <StatCard label="Ort. Puan (SS'siz)" value={num(analysis.avg_raw)} hint={`En yüksek ${num(analysis.max_raw)}`} accent="blue" testId="analysis-avg-raw" delay={100} />
        <StatCard label="Ort. Toplam Net" value={num(analysis.avg_total_net)} accent="green" testId="analysis-avg-net" delay={150} />
        <StatCard label="Puan Std. Sapması" value={num(analysis.std_sd)} accent="amber" testId="analysis-std" delay={200} />
      </div>
      <div className="analysis-chart-grid">
        <Panel title="Ders Bazlı Başarı (%)" testId="subject-success-chart">
          <figure aria-label="Derslerin ortalama net başarı oranları"><SubjectChart data={analysis.subjects} /><figcaption className="mt-2 text-xs text-slate-500">Değerlendirilen soru sayısına göre net yüzdesi. Yanlışların etkisiyle oran sıfırın altına inebilir.</figcaption></figure>
          <details className="analysis-details"><summary>Derslerin ayrıntılı değerleri</summary><SubjectTable subjects={analysis.subjects} /></details>
        </Panel>
        <Panel title="Doğru · Yanlış · Boş" testId="subject-answer-chart">
          <figure aria-label="Ders başına ortalama doğru, yanlış ve boş sayıları"><SubjectChart data={analysis.subjects} responses /><figcaption className="mt-2 text-xs text-slate-500">Her çubuk, öğrenci başına ortalama cevap sayılarını gösterir. Değerlendirme dışı sorular dahil değildir.</figcaption></figure>
        </Panel>
        <Panel title="Puan Dağılımı (SS'li)" testId="score-distribution-chart">
          <figure aria-label="Standart sapmalı puan aralıklarına göre öğrenci sayıları"><Histogram data={analysis.histogram} /><figcaption className="mt-2 text-xs text-slate-500">Yatay eksen: puan aralığı · Dikey eksen: öğrenci sayısı</figcaption></figure>
          <details className="analysis-details"><summary>Puan aralıklarının öğrenci sayıları</summary><dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">{analysis.histogram.map(h => <div key={h.range} className="flex justify-between gap-2"><dt>{h.range}</dt><dd>{h.count} öğrenci</dd></div>)}</dl></details>
        </Panel>
        <Panel title="Şube Karşılaştırması" testId="branch-comparison-chart"><BranchChart analysis={analysis} examId={exam.id} /></Panel>
      </div>
      <details className="analysis-details analysis-secondary"><summary>Sıralama ve kayıtlı değerlendirme</summary>
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
      <AiStream path={`/exams/${exam.id}/ai-analysis`} initial={exam.ai_analysis} title="Yapay Zeka Deneme Analizi" testId="ai-analysis" />
      </details>
    </div>
  );
}
