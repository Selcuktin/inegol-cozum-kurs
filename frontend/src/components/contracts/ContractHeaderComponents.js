import React from "react";
import {
  FileText,
  Calendar,
  Search,
  Filter,
  Check,
  Ban,
  X
} from "lucide-react";

export function ContractSummaryCards({ stats, fmtCurrency }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "14px",
        marginBottom: "16px"
      }}
    >
      {/* Card 1: TOPLAM SÖZLEŞME */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "16px 20px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
            TOPLAM SÖZLEŞME
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>
            {stats.totalCount}
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            background: "#2563eb",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <FileText size={18} />
        </div>
      </div>

      {/* Card 2: AKTİF SÖZLEŞME TUTARI */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "16px 20px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
            AKTİF SÖZLEŞME TUTARI
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#16a34a", marginTop: "4px" }}>
            {fmtCurrency(stats.activeAmount)}
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            background: "#16a34a",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Check size={20} strokeWidth={3} />
        </div>
      </div>

      {/* Card 3: TASLAK */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "16px 20px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
            TASLAK
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>
            {stats.draftCount}
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            background: "#f59e0b",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <FileText size={18} />
        </div>
      </div>

      {/* Card 4: İPTAL EDİLEN */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "16px 20px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
            İPTAL EDİLEN
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#dc2626", marginTop: "4px" }}>
            {stats.canceledCount}
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            background: "#ef4444",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Ban size={18} />
        </div>
      </div>
    </div>
  );
}

export function ContractFiltersBar({
  periodFilter,
  setPeriodFilter,
  periodCounts,
  setCurrentPage,
  showAdvancedFilters,
  setShowAdvancedFilters,
  statusFilter,
  setStatusFilter,
  customerFilter,
  setCustomerFilter,
  customerOptions,
  allRegisteredStudents,
  students,
  searchQuery,
  setSearchQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "8px",
        padding: "12px 18px",
        border: "1px solid #f1f5f9",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        marginBottom: "14px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        {/* Left Controls: Dönem Selector + Filtreler Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "3px 8px"
            }}
          >
            <Calendar size={15} color="#64748b" style={{ marginRight: "6px" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginRight: "6px" }}>
              Dönem
            </span>
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <option value="-1">{`Tümü (${periodCounts?.all || 0} Sözleşme)`}</option>
              <option value="113">{`2026-2027 (${periodCounts?.["113"] || 0} Sözleşme)`}</option>
              <option value="40">{`2025-2026 (${periodCounts?.["40"] || 0} Sözleşme)`}</option>
              <option value="142">{`2026-2027-YAZ (${periodCounts?.["142"] || 0} Sözleşme)`}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              background: showAdvancedFilters ? "#eff6ff" : "#f8fafc",
              border: showAdvancedFilters ? "1px solid #3b82f6" : "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: showAdvancedFilters ? "#1d4ed8" : "#475569",
              cursor: "pointer"
            }}
          >
            <Filter size={14} />
            Filtreler {showAdvancedFilters ? "▲" : "▼"}
          </button>

          {/* Quick Status Chips */}
          <div style={{ display: "inline-flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "4px",
                border: "none",
                background: statusFilter === "all" ? "#2563eb" : "#f1f5f9",
                color: statusFilter === "all" ? "#fff" : "#475569",
                cursor: "pointer"
              }}
            >
              Tümü
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter("active"); setCurrentPage(1); }}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "4px",
                border: "none",
                background: statusFilter === "active" ? "#16a34a" : "#f1f5f9",
                color: statusFilter === "active" ? "#fff" : "#475569",
                cursor: "pointer"
              }}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter("canceled"); setCurrentPage(1); }}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "4px",
                border: "none",
                background: statusFilter === "canceled" ? "#ef4444" : "#f1f5f9",
                color: statusFilter === "canceled" ? "#fff" : "#475569",
                cursor: "pointer"
              }}
            >
              İptal
            </button>
          </div>
        </div>

        {/* Right Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8"
              }}
            />
            <input
              type="text"
              placeholder="Ara: No, Adı, Sınıfı..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 10px 6px 30px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                width: "200px",
                outline: "none"
              }}
            />
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid #f1f5f9",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px"
          }}
        >
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "4px" }}>
              Müşteri / Öğrenci
            </label>
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                outline: "none"
              }}
            >
              <option value="all">Tüm Müşteriler</option>
              {customerOptions?.length
                ? customerOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                : (allRegisteredStudents?.length ? allRegisteredStudents : students || []).map((s) => (
                    <option key={s.id || s.student_name} value={s.student_name || s.id}>
                      {s.student_name}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "4px" }}>
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "4px" }}>
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setPeriodFilter("-1");
                setStatusFilter("all");
                setCustomerFilter("all");
                setSearchQuery("");
                setStartDate("");
                setEndDate("");
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                background: "#f1f5f9",
                color: "#475569",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
