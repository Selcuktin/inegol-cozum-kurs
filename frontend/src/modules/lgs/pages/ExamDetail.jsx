import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileSpreadsheet, FileText, Files, Loader2, School } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading, PageHeader } from "@/modules/lgs/components/common";
import { ResultsTable } from "@/modules/lgs/components/exam/ResultsTable";
import { AnalysisPanel } from "@/modules/lgs/components/exam/AnalysisPanel";
import { QuestionAnalysis } from "@/modules/lgs/components/exam/QuestionAnalysis";
import { ExamSettings } from "@/modules/lgs/components/exam/ExamSettings";
import { PENALTIES, api, loadError, download, errMsg } from "@/modules/lgs/api";

export function ExportButton({ path, file, label, icon: Icon, testId }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await download(path, file);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" onClick={run} disabled={busy} data-testid={testId}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}{label}
    </Button>
  );
}

export default function ExamDetail() {
  const { eid } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError('');
      const response=await api.get(`/exams/${eid}/bundle`);
      setData(response.data);
    } catch (err) {
      setError(errMsg(err));
    }
  }, [eid]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="py-16 text-sm text-red-600" data-testid="exam-load-error">{error}</div>;
  if (!data) return <Loading />;
  const { exam, results, analysis } = data;
  const slug = exam.name.replace(/[^\w-]+/g, "_");
  return (
    <div>
      <PageHeader
        eyebrow={`${exam.exam_type.name} · ${exam.date}`}
        title={exam.name}
        description={`${exam.student_count} öğrenci · ${PENALTIES.find((p) => p.value === exam.penalty)?.label} · Şablon: ${exam.template_name}`}
        actions={<div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap">
          <ExportButton path={`/exams/${eid}/export/excel`} file={`${slug}_sonuclar.xlsx`} label="Excel" icon={FileSpreadsheet} testId="export-excel-button" />
          <ExportButton path={`/exams/${eid}/export/pdf`} file={`${slug}_sonuc_listesi.pdf`} label="PDF Liste" icon={FileText} testId="export-pdf-button" />
          <ExportButton path={`/exams/${eid}/export/karneler`} file={`${slug}_karneler.pdf`} label="Tüm Karneler" icon={Files} testId="export-karneler-button" />
          <ExportButton path={`/exams/${eid}/export/sube-karneleri`} file={`${slug}_sube_karneleri.pdf`} label="Şube Karneleri" icon={School} testId="export-branches-button" />
        </div>}
      />
      <Tabs defaultValue="analysis" key={eid}>
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto bg-white p-1 shadow-sm">
          <TabsTrigger value="results" data-testid="tab-results">Sonuçlar</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">Deneme Analizi</TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">Soru Analizi</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Ayarlar</TabsTrigger>
        </TabsList>
        <TabsContent value="results"><ResultsTable exam={exam} results={results} /></TabsContent>
        <TabsContent value="analysis"><AnalysisPanel exam={exam} analysis={analysis} /></TabsContent>
        <TabsContent value="questions"><QuestionAnalysis exam={exam} analysis={analysis} /></TabsContent>
        <TabsContent value="settings"><ExamSettings key={exam.revision} exam={exam} booklets={analysis.booklets || []} onSaved={load} /></TabsContent>
      </Tabs>
    </div>
  );
}
