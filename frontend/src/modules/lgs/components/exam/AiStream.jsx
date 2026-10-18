
import { Sparkles } from "lucide-react";

export function AiStream({ initial, title = "Değerlendirme", testId = "ai" }) {
  // Yapay zekâ servisi devre dışı bırakıldığında; daha önce kaydedilmiş bir yorum varsa
  // onu temiz bir kart olarak gösterir, yoksa arayüzü kalabalıklaştırmamak için gizlenir.
  if (!initial || !initial.trim()) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm" data-testid={`${testId}-panel`}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-5 py-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-blue-900">
          <Sparkles className="h-4 w-4 text-red-600" />
          {title}
        </h3>
      </div>
      <div className="ai-text prose prose-sm max-w-none p-5 text-sm leading-relaxed text-slate-700" data-testid={`${testId}-text`}>
        <div className="whitespace-pre-wrap">{initial}</div>
      </div>
    </section>
  );
}
