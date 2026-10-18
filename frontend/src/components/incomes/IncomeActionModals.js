import React from "react";
import { Plus, X, Trash2, DollarSign } from "lucide-react";

// Para birimi formatlayıcı (₺55.000,00)
export function fmtCurrency(val) {
  const num = Number(val) || 0;
  return "₺" + num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Tarih formatlayıcı (26.09.2026)
export function fmtDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return String(isoStr);
  }
}

export function NewIncomeModal({ open, onClose, onSubmit }) {
  if (!open) return null;
  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Plus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Yeni Gelir Kaydı Oluştur
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Öğrenci veya harici müşteri için yeni tahakkuk / sözleşme geliri açın.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            onSubmit({
              ogrenciAdi: formData.get("ogrenciAdi"),
              veliAdi: formData.get("veliAdi"),
              sinifAdi: formData.get("sinifAdi"),
              gelirKategoriAdi: formData.get("gelirKategoriAdi"),
              brutTutar: formData.get("brutTutar"),
              kdvOrani: formData.get("kdvOrani"),
              taksitSayisi: formData.get("taksitSayisi"),
              gelirTarihi: formData.get("gelirTarihi"),
              vadeTarihi: formData.get("vadeTarihi"),
              aciklama: formData.get("aciklama")
            });
          }}
          style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Öğrenci Adı Soyadı *
              </label>
              <input
                type="text"
                name="ogrenciAdi"
                required
                placeholder="Örn: AHMET YILMAZ"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Veli Adı Soyadı (Müşteri)
              </label>
              <input
                type="text"
                name="veliAdi"
                placeholder="Örn: MEHMET YILMAZ"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none"
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Sınıf / Şube
              </label>
              <input
                type="text"
                name="sinifAdi"
                placeholder="Örn: 8-A, 12-SAY"
                defaultValue="8-A"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Gelir Kategorisi
              </label>
              <select
                name="gelirKategoriAdi"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  background: "#fff"
                }}
              >
                <option value="Öğrenci Sözleşmesi">Öğrenci Sözleşmesi</option>
                <option value="Yayın ve Kitap Bedeli">Yayın ve Kitap Bedeli</option>
                <option value="Etüt ve Kurs">Etüt ve Kurs</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Brüt Tutar (₺) *
              </label>
              <input
                type="number"
                name="brutTutar"
                required
                min="1"
                step="0.01"
                placeholder="Örn: 55000"
                defaultValue="55000"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  fontWeight: 700
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                KDV Oranı
              </label>
              <select
                name="kdvOrani"
                defaultValue="10"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  background: "#fff"
                }}
              >
                <option value="10">%10 (Eğitim Hizmeti)</option>
                <option value="20">%20 (Genel Hizmet)</option>
                <option value="0">%0 (Muaf / Tevkifat)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Taksit Sayısı
              </label>
              <input
                type="number"
                name="taksitSayisi"
                min="1"
                max="24"
                defaultValue="10"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Gelir Tarihi
              </label>
              <input
                type="date"
                name="gelirTarihi"
                defaultValue={new Date().toISOString().slice(0, 10)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                İlk Vade Tarihi
              </label>
              <input
                type="date"
                name="vadeTarihi"
                defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Açıklama / Not
            </label>
            <textarea
              name="aciklama"
              rows={2}
              placeholder="Gelir açıklaması veya ek not..."
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "13px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                outline: "none",
                resize: "vertical"
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "8px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer"
              }}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 20px",
                background: "#2563eb",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
              }}
            >
              ✓ Geliri Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteIncomeModal({ income, onClose, onConfirm }) {
  if (!income) return null;
  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          padding: "24px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Trash2 size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Gelir Kaydını Sil</h3>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Bu işlem geri alınamaz.</div>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: "8px",
            padding: "12px 14px",
            border: "1px solid #e2e8f0",
            fontSize: "13px",
            marginBottom: "20px"
          }}
        >
          <div>
            Gelir Kodu: <b>{income.gelirKodu}</b>
          </div>
          <div>
            Öğrenci: <b>{income.ogrenciAdiSoyadi || income.musteriUnvan}</b>
          </div>
          <div>
            Brüt Tutar: <b>{fmtCurrency(income.brutTutar)}</b>
          </div>
          <div>
            Kalan Alacak: <b style={{ color: "#dc2626" }}>{fmtCurrency(income.kalanAlacak)}</b>
          </div>
        </div>

        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
          <b>{income.gelirKodu}</b> nolu gelir kaydını ve varsa bağlı taksit planını listeden kaldırmak istediğinize emin misiniz?
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#f1f5f9",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
              cursor: "pointer"
            }}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => onConfirm(income)}
            style={{
              padding: "8px 18px",
              background: "#dc2626",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(220,38,38,0.2)"
            }}
          >
            🗑️ Evet, Geliri Sil
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuickCollectModal({ income, onClose, onConfirm }) {
  if (!income) return null;
  return (
    <div
      className="responsive-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "500px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#16a34a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <DollarSign size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Tahsilat Al</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                {income.gelirKodu} • {income.ogrenciAdiSoyadi || income.musteriUnvan}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            onConfirm(income, formData.get("collectAmount"));
          }}
          style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534" }}>TOPLAM BRÜT TUTAR</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{fmtCurrency(income.brutTutar)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#dc2626" }}>KALAN ALACAK</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#dc2626" }}>{fmtCurrency(income.kalanAlacak)}</div>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Tahsil Edilecek Tutar (₺) *
            </label>
            <input
              type="number"
              name="collectAmount"
              required
              min="1"
              max={income.kalanAlacak}
              step="0.01"
              defaultValue={
                income.taksitSayisi && income.kalanAlacak > 0
                  ? Math.round((income.brutTutar / income.taksitSayisi) * 100) / 100
                  : income.kalanAlacak
              }
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "16px",
                border: "2px solid #22c55e",
                borderRadius: "6px",
                outline: "none",
                fontWeight: 700,
                color: "#0f172a"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Tahsilat Yöntemi
              </label>
              <select
                name="method"
                defaultValue="Banka Havalesi / EFT"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  background: "#fff"
                }}
              >
                <option value="Banka Havalesi / EFT">Banka Havalesi / EFT</option>
                <option value="Nakit Kasa">Nakit Kasa</option>
                <option value="Kredi Kartı / POS">Kredi Kartı / POS</option>
                <option value="Senet">Senet</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Kasa / Hesap
              </label>
              <select
                name="account"
                defaultValue="Vakıfbank İnegöl Şb."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  outline: "none",
                  background: "#fff"
                }}
              >
                <option value="Vakıfbank İnegöl Şb.">Vakıfbank İnegöl Şb.</option>
                <option value="Halkbank İnegöl Şb.">Halkbank İnegöl Şb.</option>
                <option value="Merkez Nakit Kasa">Merkez Nakit Kasa</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "8px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer"
              }}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 20px",
                background: "#16a34a",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(22,163,74,0.25)"
              }}
            >
              ✓ Tahsilatı Onayla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
