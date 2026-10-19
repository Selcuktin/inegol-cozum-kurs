import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subjectColor } from "@/modules/lgs/api";

const clean = (v, n) => v.toLocaleUpperCase("tr-TR").replace(/[^ABCDEX* ]/g, "").slice(0, n);

function KeyInputs({ subjects, keys, onChange, booklet }) {
  return (
    <div className="space-y-3">
      {subjects.map((s, i) => {
        const v = keys[s.key] || "";
        const full = v.replace(/ /g, "").length === s.question_count;
        return (
          <div key={s.key} className="grid grid-cols-1 items-center gap-2 md:grid-cols-[180px_1fr_70px]">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(s.key, i) }} />{s.name}
            </div>
            <Input value={v} onChange={(e) => onChange({ ...keys, [s.key]: clean(e.target.value, s.question_count) })}
              placeholder={`${s.question_count} cevap, ör. ABCDDCBA...`} className="font-mono text-xs sm:text-sm tracking-wider sm:tracking-[0.25em]" data-testid={`answer-key-${booklet}-${s.key}`} />
            <span className={`text-left md:text-right font-mono text-xs font-semibold ${full ? "text-emerald-600" : "text-amber-600"}`} data-testid={`answer-key-count-${booklet}-${s.key}`}>{v.replace(/ /g, "").length}/{s.question_count}</span>
          </div>
        );
      })}
    </div>
  );
}

function MapInput({ s, value, onChange, booklet }) {
  const [text, setText] = useState((value || []).join(","));
  const nums = text.split(/[^0-9]+/).filter(Boolean).map(Number);
  const n = s.question_count;
  const valid = nums.length === n && [...nums].sort((a, b) => a - b).every((x, i) => x === i + 1);
  return (
    <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[180px_1fr_90px]">
      <div className="text-sm font-medium text-slate-700">{s.name}</div>
      <Input value={text} placeholder={`${booklet} 1. soru = A'daki kaçıncı soru? ör. 3,1,2,...`} className="font-mono text-xs"
        onChange={(e) => {
          setText(e.target.value);
          const arr = e.target.value.split(/[^0-9]+/).filter(Boolean).map(Number);
          onChange(arr.length ? arr : undefined);
        }} data-testid={`booklet-map-${booklet}-${s.key}`} />
      <span className={`text-right font-mono text-xs font-semibold ${!text ? "text-slate-400" : valid ? "text-emerald-600" : "text-red-600"}`} data-testid={`booklet-map-status-${booklet}-${s.key}`}>
        {!text ? "eşleştirilmedi" : valid ? "geçerli" : `${nums.length}/${n} hatalı`}
      </span>
    </div>
  );
}

function MapInputs({ subjects, booklet, maps, onChange }) {
  return (
    <div className="mt-6 rounded-md border border-blue-100 bg-blue-50/40 p-4" data-testid={`booklet-map-panel-${booklet}`}>
      <div className="mb-1 text-sm font-semibold text-blue-900">{booklet} → A Soru Eşleştirmesi</div>
      <p className="mb-3 text-xs text-slate-500">{booklet} kitapçığındaki her sorunun A kitapçığındaki numarasını sırayla yazın. Girilirse soru analizi tek tabloda (A sırası) birleşir; {booklet} anahtarı boşsa A anahtarından otomatik türetilir. Boş bırakılırsa bu kitapçık birleşik soru analizine dahil edilmez.</p>
      <div className="space-y-2">
        {subjects.map((s) => (
          <MapInput key={s.key} s={s} booklet={booklet} value={maps[s.key]} onChange={(arr) => {
            const next = { ...maps };
            if (arr) next[s.key] = arr; else delete next[s.key];
            onChange(next);
          }} />
        ))}
      </div>
    </div>
  );
}

export function AnswerKeyEditor({ subjects, booklets, value, onChange, maps = {}, onMapsChange }) {
  const list = booklets.length ? booklets : ["A"];
  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">Cevapları bitişik yazın (A, B, C, D, E). İptal edilen soru için <b>X</b> yazın (herkese doğru sayılır). Her kitapçık için anahtar veya A kitapçığıyla geçerli soru eşleştirmesi gereklidir.</p>
      <Tabs defaultValue={list[0]}>
        <TabsList className="mb-4">
          {list.map((b) => <TabsTrigger key={b} value={b} data-testid={`answer-key-tab-${b}`}>{b} Kitapçığı</TabsTrigger>)}
        </TabsList>
        {list.map((b) => (
          <TabsContent key={b} value={b}>
            {b !== "A" && !Object.values(value[b] || {}).some((v) => v.trim()) && !Object.keys(maps[b] || {}).length && (
              <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid={`answer-key-warning-${b}`}>
                {b} kitapçığı için anahtar veya soru eşleştirmesi girilmedi; bu öğrenciler için puanlama yapılmaz. Soru sırası farklıysa {b} anahtarını ya da aşağıdaki eşleştirmeyi girin.
              </div>
            )}
            <KeyInputs subjects={subjects} booklet={b} keys={value[b] || {}} onChange={(k) => onChange({ ...value, [b]: k })} />
            {b !== "A" && onMapsChange && <MapInputs subjects={subjects} booklet={b} maps={maps[b] || {}} onChange={(m) => onMapsChange({ ...maps, [b]: m })} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export function keysFromRow(row, subjects, mapping) {
  const out = {};
  subjects.forEach((s) => {
    const m = mapping[s.key];
    if (!m) return;
    const raw = row.answers[String(m.field_index)] || "";
    out[s.key] = raw.slice(m.start - 1, m.start - 1 + s.question_count);
  });
  return out;
}
