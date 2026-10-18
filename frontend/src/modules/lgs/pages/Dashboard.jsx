import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading, PageHeader, Panel, StatCard } from "@/modules/lgs/components/common";
import { api, loadError, num } from "@/modules/lgs/api";

export function ExamRows({ exams, onOpen, onDelete }) {
  if (!exams.length) return <div className="py-10 text-center text-sm text-slate-500" data-testid="no-exams">Henüz okunmuş sınav yok.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-3">Sınav</th><th className="py-2 pr-3">Tarih</th><th className="py-2 pr-3">Tür</th>
            <th className="py-2 pr-3 text-right">Öğrenci</th><th className="py-2 pr-3 text-right">Ort. Puan (SS'li)</th>
            <th className="py-2 pr-3 text-right">Ort. Puan (SS'siz)</th><th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {exams.map((e) => (
            <tr key={e.id} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50" onClick={() => onOpen(e.id)} data-testid={`exam-row-${e.id}`}>
              <td className="py-3 pr-3 font-medium text-slate-900"><button className="text-left hover:underline" onClick={event=>{event.stopPropagation();onOpen(e.id);}}>{e.name}</button></td>
              <td className="py-3 pr-3 text-slate-600">{e.date}</td>
              <td className="py-3 pr-3"><span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">{e.exam_type?.name}</span></td>
              <td className="py-3 pr-3 text-right font-mono">{e.student_count}</td>
              <td className="py-3 pr-3 text-right font-mono font-semibold text-red-600">{num(e.summary?.avg_sd)}</td>
              <td className="py-3 pr-3 text-right font-mono">{num(e.summary?.avg_raw)}</td>
              <td className="py-3 text-right">
                {onDelete ? (
                  <button className="text-xs font-medium text-slate-400 hover:text-red-600" data-testid={`exam-delete-${e.id}`} onClick={(ev) => { ev.stopPropagation(); onDelete(e); }}>Sil</button>
                ) : <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(loadError);
  }, []);

  if (!data) return <Loading />;
  const last = data.recent[0];
  return (
    <div>
      <PageHeader
        eyebrow="İnegöl Çözüm Kurs"
        title="Genel Bakış"
        description="Optik okuma sonuçları, puanlar ve deneme analizleri tek panelde."
        actions={<Button asChild className="bg-red-600 hover:bg-red-700" data-testid="dashboard-new-exam-button"><Link to="/sinav/yeni"><FilePlus2 className="mr-2 h-4 w-4" />Yeni Sınav Oku</Link></Button>}
      />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Okunan Sınav" value={data.exam_count} testId="stat-exam-count" />
        <StatCard label="Okunan Optik Form" value={data.student_reads} accent="blue" testId="stat-student-reads" delay={60} />
        <StatCard label="Son Sınav Ort. (SS'li)" value={last ? num(last.summary?.avg_sd) : "-"} hint={last?.name} accent="green" testId="stat-last-avg" delay={120} />
        <StatCard label="FMT Şablonu" value={data.template_count} hint={`${data.exam_type_count} sınav türü tanımlı`} accent="amber" testId="stat-template-count" delay={180} />
      </div>
      <Panel title="Son Sınavlar" testId="recent-exams-panel" actions={<Link to="/sinavlar" className="text-sm font-medium text-blue-800 hover:underline" data-testid="all-exams-link">Tümünü gör</Link>}>
        <ExamRows exams={data.recent} onOpen={(id) => navigate(`/sinav/${id}`)} />
      </Panel>
    </div>
  );
}
