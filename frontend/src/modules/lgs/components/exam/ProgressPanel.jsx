import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Panel } from "@/modules/lgs/components/common";
import { api, loadError, num } from "@/modules/lgs/api";

function Trend({ items }) {
  if (items.length < 2) return null;
  const diff = items[items.length - 1].score_sd - items[items.length - 2].score_sd;
  const up = diff >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`} data-testid="progress-trend">
      <Icon className="h-3.5 w-3.5" />{up ? "+" : ""}{num(diff)} puan (son deneme)
    </span>
  );
}

function ProgressTable({ items, currentId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm" data-testid="progress-table">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-slate-500 [&>th]:px-2"><th className="py-2">Deneme</th><th>Tarih</th><th className="text-right">Net</th><th className="text-right">SS'siz</th><th className="text-right">SS'li</th><th className="text-right">Sıra</th></tr></thead>
        <tbody className="font-mono">
          {items.map((x) => (
            <tr key={x.result_id} className={`border-b border-slate-100 [&>td]:px-2 ${x.result_id === currentId ? "bg-red-50/50" : ""}`}>
              <td className="py-2 font-sans font-medium"><Link to={`/sinav/${x.exam_id}/ogrenci/${x.result_id}`} className="text-blue-800 hover:underline" data-testid={`progress-link-${x.result_id}`}>{x.exam_name}</Link></td>
              <td className="text-slate-500">{x.date}</td><td className="text-right">{num(x.total_net)}</td>
              <td className="text-right">{num(x.score_raw)}</td><td className="text-right font-semibold text-red-600">{num(x.score_sd)}</td>
              <td className="text-right">{x.rank}/{x.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressPanel({ rid }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get(`/results/${rid}/progress`).then((r) => setItems(r.data)).catch(loadError);
  }, [rid]);

  if (!items) return null;
  const data = items.map((x) => ({ name: `${x.exam_name.length > 12 ? `${x.exam_name.slice(0, 12)}…` : x.exam_name} (${x.date.slice(5)})`, "SS'li Puan": x.score_sd, "SS'siz Puan": x.score_raw }));
  return (
    <Panel title="Gelişim Takibi" testId="progress-panel" actions={<Trend items={items} />}>
      {items.length < 2 ? (
        <p className="text-sm text-slate-500" data-testid="progress-empty">Gelişim grafiği için öğrencinin en az iki denemesi gerekir (öğrenci numarasıyla eşleştirilir).</p>
      ) : (
        <div className="space-y-5">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[200, 500]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => num(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="SS'li Puan" stroke="#D9231D" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="SS'siz Puan" stroke="#1E40AF" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <ProgressTable items={items} currentId={rid} />
        </div>
      )}
    </Panel>
  );
}
