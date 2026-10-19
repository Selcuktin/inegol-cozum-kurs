import { Loader2 } from "lucide-react";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="rise mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-600">{eyebrow}</div>}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" data-testid="page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = "red", testId, delay = 0 }) {
  const bar = accent === "blue" ? "bg-blue-800" : accent === "green" ? "bg-emerald-600" : accent === "amber" ? "bg-amber-500" : "bg-red-600";
  return (
    <div className="rise relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm" style={{ animationDelay: `${delay}ms` }} data-testid={testId}>
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Loading({ text = "Yükleniyor..." }) {
  return (
    <div className="flex items-center gap-2 py-16 text-sm text-slate-500" data-testid="loading">
      <Loader2 className="h-4 w-4 animate-spin text-red-600" /> {text}
    </div>
  );
}

export function Panel({ title, actions, children, className = "", testId }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`} data-testid={testId}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
