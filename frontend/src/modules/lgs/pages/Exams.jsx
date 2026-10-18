import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loading, PageHeader, Panel } from "@/modules/lgs/components/common";
import { ExamRows } from "@/modules/lgs/pages/Dashboard";
import { api, loadError, errMsg } from "@/modules/lgs/api";

export default function Exams() {
  const [exams, setExams] = useState(null);
  const [next,setNext]=useState(null);
  const navigate = useNavigate();
  const load = (before) => api.get(`/exams${before?`?before=${encodeURIComponent(before)}`:""}`).then(r=>{setExams(previous=>before?[...previous,...r.data.items]:r.data.items);setNext(r.data.next);}).catch(loadError);

  useEffect(() => {
    load();
  }, []);

  const remove = async (e) => {
    if (!window.confirm(`"${e.name}" sınavı ve tüm sonuçları silinsin mi?`)) return;
    try {
      await api.delete(`/exams/${e.id}`, {data:{expected_revision:e.revision}});
      toast.success("Sınav silindi");
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Arşiv"
        title="Sınavlar"
        description="Okunan tüm denemeler. Detay ve analiz için satıra tıklayın."
        actions={<Button asChild className="bg-red-600 hover:bg-red-700" data-testid="exams-new-exam-button"><Link to="/sinav/yeni"><FilePlus2 className="mr-2 h-4 w-4" />Yeni Sınav Oku</Link></Button>}
      />
      <Panel testId="exams-list-panel">
        {exams ? <ExamRows exams={exams} onOpen={(id) => navigate(`/sinav/${id}`)} onDelete={remove} /> : <Loading />}
      </Panel>
      {next&&<Button variant="outline" onClick={()=>load(next)}>Daha fazla sınav</Button>}
    </div>
  );
}
