import { useEffect, useState } from "react";
import { Copy, Link2, Loader2, Mail, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/modules/lgs/components/common";
import { api, loadError, errMsg, num } from "@/modules/lgs/api";

const waPhone = (tel) => {
  let d = (tel || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `90${d}`;
  return d;
};

export function SharePanel({ rid, result, exam }) {
  const [c, setC] = useState({ veli_tel: "", veli_email: "", url: "", revision:0 });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let current=true;
    setC({veli_tel:'',veli_email:'',url:'',revision:0});
    api.get(`/results/${rid}/share`).then((r) => {if(current)setC(r.data);}).catch(e=>{if(current)loadError(e);});
    return()=>{current=false;};
  }, [rid]);

  const act = async (kind, fn) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const saveContact = () => act("save", async () => {
    const r = await api.put(`/results/${rid}/contact`, { veli_tel: c.veli_tel, veli_email: c.veli_email, expected_revision:c.revision });
    setC({ ...c, ...r.data });
    toast.success("Veli bilgileri kaydedildi");
  });
  const ensureUrl = async () => {
    if (c.url) return c.url;
    const r = await api.post(`/results/${rid}/share`);
    setC((x) => ({ ...x, url: r.data.url }));
    return r.data.url;
  };
  const whatsapp = () => act("wa", async () => {
    const phone = waPhone(c.veli_tel);
    if (phone.length < 11) throw new Error("Geçerli bir veli telefonu girin");
    const win = window.open("", "_blank");
    const url = await ensureUrl();
    const text = `Sayın Veli, ${result.name} adlı öğrencimizin ${exam.name} (${exam.date}) deneme sonucu:\nPuan: ${num(result.score_sd)}\nGenel Sıra: ${result.rank}\nKarne: ${url}\n\nİnegöl Çözüm Kurs`;
    const wa = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    if (win) win.location.href = wa; else window.location.href = wa;
  });
  const email = () => act("mail", async () => {
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.veli_email))throw new Error('Geçerli veli e-postası girin');
    const url=await ensureUrl();
    window.location.href=`mailto:${encodeURIComponent(c.veli_email)}?subject=${encodeURIComponent(`${exam.name} — ${result.name}`)}&body=${encodeURIComponent(`Sayın Veli, ${result.name} için deneme karnesi: ${url}`)}`;
  });
  const copy = () => act("copy", async () => {
    const url = await ensureUrl();
    await navigator.clipboard.writeText(url);
    toast.success("Karne linki kopyalandı");
  });

  const spin = (k, Icon) => (busy === k ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />);
  return (
    <Panel title="Veliye Gönder" testId="share-panel">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5"><Label>Veli Telefonu</Label><Input value={c.veli_tel} onChange={(e) => setC({ ...c, veli_tel: e.target.value })} placeholder="05xx xxx xx xx" data-testid="veli-tel-input" /></div>
        <div className="space-y-1.5"><Label>Veli E-postası</Label><Input type="email" value={c.veli_email} onChange={(e) => setC({ ...c, veli_email: e.target.value })} placeholder="veli@ornek.com" data-testid="veli-email-input" /></div>
        <Button variant="outline" className="w-full md:w-auto" onClick={saveContact} disabled={!!busy} data-testid="veli-save-button">{spin("save", Save)}Kaydet</Button>
      </div>
      <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-2">
        {c.url && <Button variant="outline" disabled={!!busy} onClick={()=>act('revoke',async()=>{await api.delete(`/results/${rid}/share`);setC(x=>({...x,url:''}));toast.success('Eski karne bağlantısı kapatıldı. Yeniden paylaşımda yeni link oluşturulur.');})} data-testid="share-revoke-button">Paylaşımı Kapat</Button>}
        <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700" onClick={whatsapp} disabled={!!busy || !c.veli_tel} data-testid="share-whatsapp-button">{spin("wa", MessageCircle)}WhatsApp ile Gönder</Button>
        <Button className="w-full sm:w-auto bg-blue-800 hover:bg-blue-900" onClick={email} disabled={!!busy || !c.veli_email} data-testid="share-email-button">{spin("mail", Mail)}E-posta Taslağı Aç</Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={copy} disabled={!!busy} data-testid="share-copy-button">{spin("copy", Copy)}Linki Kopyala</Button>
      </div>
      {c.url && <div className="mt-3 flex items-center gap-2 truncate text-xs text-slate-500" data-testid="share-url"><Link2 className="h-3.5 w-3.5 shrink-0" />{c.url}</div>}
      <p className="mt-2 text-xs text-slate-400">Bilgiler kimlik numarası veya öğrenci numarası ve adı eşleştiğinde sonraki denemelerde dolar. E-posta düğmesi posta uygulamanızda bağlantılı bir taslak açar; gönderimi siz tamamlarsınız.</p>
    </Panel>
  );
}
