# Teknik Uygulama Planı: İnegöl Çözüm Kurs ERP (Edesis Parity & Cloudflare Pages)

**Tarih:** 1 Ekim 2026  
**Durum:** Hazır / Uygulamaya Başlanabilir  
**Hedef Proje Dizini:** `C:\Users\aslan\Desktop\cozum`  
**Yedekleme Dizini:** `C:\Users\aslan\Desktop\cozum_backup_20261001`  
**Referans Şema:** `C:\Users\aslan\Desktop\cozum\edesis_swagger.json` (4.463 Endpoint, 10MB)

---

## 1. Yönetici Özeti & Mimari Kararlar

Mevcut `C:\Users\aslan\Desktop\cozum` projesi; Cloudflare Pages Functions, Cloudflare D1 veritabanı (`inegol-cozum-db`), React frontend ve GitHub reposuyla (`Selcuktin/inegol-cozum-kurs.git`) halihazırda kuruludur. 

Sıfırdan başlamak yerine bu projenin üzerine yazmak; Cloudflare ayarlarını korumak, dağıtım sürecini dakikalara indirmek ve mevcut çalışan modülleri (Sınav Karnesi, Yoklama, Taksitler) doğrudan Edesis Swagger şemasıyla birebir uyumlu hale getirmek için en hızlı ve doğru çözümdür.

### Temel Mimari Prensipleri:
1. **Cloudflare D1 (SQLite Edge):** Tüm veriler tek bir sunucusuz D1 veritabanında tutulur.
2. **Cloudflare Pages Functions (`/api/[[route]].js`):** Edesis'in kullandığı ABP Controller uç noktalarını (`GetSummary`, `GetRecentRegistrations`, `GetClassCapacities`, `GetGradeDistribution`, `GetMissingDataAlerts`) doğrudan karşılar.
3. **Responsive UI (Mobile-First + Desktop ERP):** Masaüstünde geniş sol menü ve veri tabloları; mobilde bottom navigation (alt menü), touch-friendly kartlar ve PWA desteği.
4. **Sertleştirilmiş Yetkilendirme (Admin-Only Giriş):** Güvenlik denetimi kararı doğrultusunda personel/öğretmen/muhasebe hızlı girişleri tamamen kaldırılmıştır. Sisteme yalnızca yetkili Yönetici (Admin) parolası ve Google bulut doğrulaması ile giriş yapılabilir.
5. **Universal Auth Guard & KVKK:** Tüm API veri uçları oturumsuz anonim erişime kapatılmıştır (HTTP 401). Gerçek öğrenci/öğretmen kişisel verilerini içeren tohum ve migration scriptleri repodan çıkarılmıştır.

---

## 2. Faz 0: Veri Modeli ve Şema Genişletmesi (D1 Migration)

Mevcut `schema.sql` üzerine şu Edesis çekirdek tabloları entegre edilir:

```sql
-- 1. Akademik Dönemler (DonemId mantığı)
CREATE TABLE IF NOT EXISTS academic_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER DEFAULT 6114,
  name TEXT NOT NULL,          -- Örn: "2024-2025 Eğitim Öğretim Yılı"
  is_active INTEGER DEFAULT 1,
  start_date TEXT,
  end_date TEXT
);

-- 2. Eksik Veri & Evrak Uyarıları (GetMissingDataAlerts için)
CREATE TABLE IF NOT EXISTS data_alerts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,    -- 'tc_missing', 'photo_missing', 'contract_missing', 'payment_overdue'
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3. Kurumsal Şube & Multi-Tenant (TenantId: 6114)
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT DEFAULT 'Bursa',
  district TEXT DEFAULT 'İnegöl',
  phone TEXT,
  logo_url TEXT
);
```

---

## 3. Faz 1: API Sözleşmeleri (Cloudflare Pages Functions)

Aşağıdaki Edesis API uç noktaları `functions/api/[[route]].js` dosyasına eklenir:

| Uç Nokta | HTTP | Görevi & Dönen Veri |
| :--- | :--- | :--- |
| `/api/services/app/Dashboard/GetSummary` veya `/api/GetSummary` | GET | `totalStudents`, `activeRegistrations`, `monthlyCollected`, `monthlyExpenses`, `capacityRate` |
| `/api/services/app/Dashboard/GetRecentRegistrations` | GET | Son 5 kaydolan öğrencinin adı, sınıfı, veli telefonu, kayıt tarihi |
| `/api/services/app/Dashboard/GetClassCapacities` | GET | Sınıfların kontenjanları, mevcut kayıt sayıları ve doluluk yüzdeleri |
| `/api/services/app/Dashboard/GetGradeDistribution` | GET | 9, 10, 11, 12 ve Mezun gruplarının öğrenci sayıları (Grafik) |
| `/api/services/app/Dashboard/GetStudentStateDistribution` | GET | Kayıtlı, Ayrılan, Donduran, Burslu öğrenci dağılımı |
| `/api/services/app/Dashboard/GetMissingDataAlerts` | GET | Fotoğrafı, TC'si veya sözleşmesi eksik öğrencilerin listesi |

---

## 4. Faz 2: Ön Yüz (Frontend) Entegrasyonu

1. **Dashboard Senkronizasyonu:**
   * Edesis'in birebir dashboard sayaçları (`GetSummary` kartları),
   * Sınıf doluluk bar grafikleri (`GetClassCapacities`),
   * Son kayıtlar tablosu (`GetRecentRegistrations`),
   * Eksik evrak uyarı banner'ları (`GetMissingDataAlerts`).
2. **Mobil Uyumluluk:**
   * Mobilde alt bar (Bottom Navigation): `Dashboard`, `Öğrenciler`, `Sınavlar`, `Yoklama`, `Muhasebe`.
   * Dokunmatik kartlar ve modal görünümleri.
3. **PWA (Progressive Web App):**
   * `manifest.json` ve `sw.js` üzerinden telefona uygulama gibi yükleme.

---

## 5. Doğrulama ve Test Senaryoları (Quickstart)

1. **Lokal Test:** `npm run dev` veya `wrangler pages dev build --d1 DB=inegol-cozum-db` ile backend + frontend çalıştırma.
2. **API Doğrulama:**
   * `/api/GetSummary?DonemId=113` çağrısı -> 200 OK ve JSON sayaçları.
   * `/api/GetRecentRegistrations?Count=5` çağrısı -> 200 OK ve 5 öğrenci kaydı.
3. **Canlı Dağıtım:** `git push origin main` -> Cloudflare Pages otomatik build ve canlıya alma.
