import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search, X, User, FileText, CreditCard, ChevronRight, Loader2 } from "lucide-react";

export function OmniSearchModal({
  isOpen = false,
  onClose = () => {},
  onSelectStudent = () => {},
  onSelectContract = () => {},
  onSelectPayment = () => {}
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ students: [], contracts: [], payments: [], total: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults({ students: [], contracts: [], payments: [], total: 0 });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ students: [], contracts: [], payments: [], total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/search/omni?q=${encodeURIComponent(trimmed)}`);
        setResults(res.data || { students: [], contracts: [], payments: [], total: 0 });
        setSelectedIndex(0);
      } catch (err) {
        console.error("Omni search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Flattened items for keyboard arrow navigation
  const allItems = [
    ...(results.students || []).map((item) => ({ type: "student", data: item })),
    ...(results.contracts || []).map((item) => ({ type: "contract", data: item })),
    ...(results.payments || []).map((item) => ({ type: "payment", data: item }))
  ];

  const handleKeyDown = (e) => {
    if (allItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = allItems[selectedIndex];
      if (selected) handleItemClick(selected);
    }
  };

  const handleItemClick = (item) => {
    onClose();
    if (item.type === "student") onSelectStudent(item.data);
    else if (item.type === "contract") onSelectContract(item.data);
    else if (item.type === "payment") onSelectPayment(item.data);
  };

  if (!isOpen) return null;

  return (
    <div
      className="omni-search-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 16px 20px 16px",
        boxSizing: "border-box"
      }}
    >
      <div
        className="omni-search-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          width: "100%",
          maxWidth: "680px",
          borderRadius: "14px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          animation: "fadeIn 0.15s ease-out"
        }}
      >
        {/* Search Input Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff"
          }}
        >
          <Search size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Öğrenci adı, TC Kimlik, telefon, sözleşme no veya makbuz ara..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "15px",
              fontWeight: "500",
              color: "#0f172a",
              background: "transparent"
            }}
          />
          {loading && <Loader2 size={18} className="spin" color="#64748b" style={{ flexShrink: 0 }} />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{ border: "none", background: "none", cursor: "pointer", padding: "4px", color: "#94a3b8" }}
            >
              <X size={16} />
            </button>
          )}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              background: "#f1f5f9",
              color: "#64748b",
              padding: "3px 7px",
              borderRadius: "5px",
              border: "1px solid #e2e8f0",
              letterSpacing: "0.5px"
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ overflowY: "auto", padding: "12px 14px", flex: 1 }}>
          {query.trim().length < 2 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
              <div style={{ fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Hızlı Arama İpuçları</div>
              <div>Herhangi bir öğrenci adı, TC Kimlik No, Veli Telefonu, Sözleşme No veya Makbuz No yazarak sistemde anında arama yapabilirsiniz.</div>
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "center", fontSize: "11px", color: "#94a3b8" }}>
                <span>↑↓ ile gezin</span> · <span>ENTER ile seç</span> · <span>ESC ile kapat</span>
              </div>
            </div>
          ) : results.total === 0 && !loading ? (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13.5px" }}>
              <div style={{ fontSize: "22px", marginBottom: "6px" }}>📂</div>
              <strong>"{query}"</strong> ile eşleşen öğrenci, sözleşme veya tahsilat kaydı bulunamadı.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* ÖĞRENCİLER */}
              {results.students?.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", padding: "4px 8px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={13} /> Öğrenciler ({results.students.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
                    {results.students.map((s, idx) => {
                      const itemIdx = idx;
                      const isSelected = selectedIndex === itemIdx;
                      const remaining = Math.max(0, (Number(s.total_fee) || 0) - (Number(s.paid_amount) || 0));

                      return (
                        <div
                          key={s.id}
                          onClick={() => handleItemClick({ type: "student", data: s })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            background: isSelected ? "#eff6ff" : "transparent",
                            border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                            transition: "all 0.1s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                              {(s.student_name || "Ö").slice(0, 1)}
                            </div>
                            <div>
                              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                                {s.student_name}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                                {s.student_class && <span>{s.student_class} · </span>}
                                {s.student_tc && <span>TC: {s.student_tc} · </span>}
                                {s.parent_name && <span>Veli: {s.parent_name}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "12.5px", fontWeight: 700, color: remaining > 0 ? "#dc2626" : "#16a34a" }}>
                              {remaining > 0 ? `Kalan: ₺${remaining.toLocaleString("tr-TR")}` : "Ödendi ✓"}
                            </div>
                            <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                              Toplam: ₺{Number(s.total_fee || 0).toLocaleString("tr-TR")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SÖZLEŞMELER */}
              {results.contracts?.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", padding: "4px 8px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={13} /> Sözleşmeler ({results.contracts.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
                    {results.contracts.map((c, idx) => {
                      const itemIdx = (results.students?.length || 0) + idx;
                      const isSelected = selectedIndex === itemIdx;

                      return (
                        <div
                          key={c.id}
                          onClick={() => handleItemClick({ type: "contract", data: c })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            background: isSelected ? "#f0fdf4" : "transparent",
                            border: isSelected ? "1px solid #bbf7d0" : "1px solid transparent",
                            transition: "all 0.1s"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 800 }}>{c.sozlesme_no || "SÖZLEŞME"}</span>
                              <span>· {c.student_name}</span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                              Veli: {c.parent_name || "—"} · Tarih: {c.sozlesme_tarihi || "—"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                            ₺{Number(c.brut_tutar || 0).toLocaleString("tr-TR")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAHSİLATLAR */}
              {results.payments?.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", padding: "4px 8px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CreditCard size={13} /> Tahsilatlar & Makbuzlar ({results.payments.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
                    {results.payments.map((p, idx) => {
                      const itemIdx = (results.students?.length || 0) + (results.contracts?.length || 0) + idx;
                      const isSelected = selectedIndex === itemIdx;

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleItemClick({ type: "payment", data: p })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "9px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            background: isSelected ? "#fffbeb" : "transparent",
                            border: isSelected ? "1px solid #fde68a" : "1px solid transparent",
                            transition: "all 0.1s"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                              {p.student_name || "Öğrenci"} · {p.note || "Eğitim Taksit Tahsilatı"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                              Makbuz: {p.receipt_no || p.id} · Yöntem: {p.method || "Nakit Kasa"} · {p.payment_date}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontSize: "13px", fontWeight: 800, color: "#15803d" }}>
                            +₺{Number(p.amount || 0).toLocaleString("tr-TR")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: "9px 16px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            fontSize: "11px",
            color: "#64748b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>Özel İnegöl Çözüm Kurs Merkezi · <strong>Omni Search v1</strong></span>
          <div style={{ display: "flex", gap: "10px" }}>
            <span>Seç: <kbd style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: "3px" }}>↵ Enter</kbd></span>
            <span>Kapat: <kbd style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: "3px" }}>Esc</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
}
