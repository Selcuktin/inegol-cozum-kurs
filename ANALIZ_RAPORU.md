# İnegöl Çözüm Kurs (Edesis ERP) — Kapsamlı Mimari & Hata Analizi

**Analiz tarihi:** 2026-10-11 · **Commit analizi:** 112 commit, main branch · **Test sonucu:** 21 suite / 203 test — HEPİSİ GEÇİYOR ✅

---

## 1. Genel Mimari Bakış

```
[React 19 SPA — CRA/craco]  →  [Cloudflare Pages Functions (/api/*)]  →  [Cloudflare D1 (SQLite)]
        ↑                                    ↑
  hash routing (App.js)          7 alt domain router (auth/students/
                                 contracts/accounting/academic/exams/system)
```

| Katman | Dosyalar | Boyut |
|---|---|---|
| Routing + Nav | `frontend/src/App.js` | 951 satır (nav + state + purge + kategori listesi) |
| Page sarmalayıcılar | `frontend/src/pages/*` | İyi ayrıştırılmış (Dashboard, Students, Contracts, Accounting…) |
| Servis katmanı (SSOT) | `lib/edesisAccountingService.js` (1237), `lib/edesisStudentService.js` (209) | localStorage mirror + API client |
| UI | 15+ büyük modal/component (500–1900 satır) | ~25.000 satır |
| API | `functions/api/[[route]].js` + 7 router | ~2.700 satır |
| DB | `frontend/schema.sql` (550 satır) + 3 migration SQL | 17 tablo |

---

## 2. 🔴 KRİTİK BULGULAR (öncelik sırasına göre)

### 2.1 Güvenlik — hemen yapılmalı

| # | Sorun | Konum | Risk |
|---|---|---|---|
| G1 | **Admin parolası kod içine gömülü** — `["cozum2026", "admin4321", "admin", "inegol2026"]`, personel şifresi `4321`. Repo GitHub'da → herkes admin olabilir. | `functions/api/routes/auth.js:18-19` | Tam sistem ele geçirilmesi |
| G2 | **Auth yok sayılıyor**: `/auth/me` token yoksa misafiri "Yönetici/admin" olarak döndürüyor. Router'da `user` çözümleniyor ama **mutasyon endpoint'lerinde rol kontrolü yok** — öğrenci silme, sözleşme silme, tahsilat iptali anonim çağrılabilir. | `auth.js:47-57`, tüm routerlar | Yetkisiz veri silme/değiştirme |
| G3 | **`Access-Control-Allow-Origin: *`** + cookie bazlı oturum. Herhangi bir siteden API çağrılabilir. | `utils.js:13` | CSRF benzeri kötüye kullanım |
| G4 | **Sözleşme dosyaları D1'de base64 metin sütununda** (10MB'a kadar). D1 satır limiti ~2MB → büyük yükleme sessizce kırılır; ayrıca R2 kullanılmamış. | `students.js` contract-upload | Yükleme bozulması + DB şişmesi |

### 2.2 Veri bütünlüğü — kök neden

**Tek ve en büyük yapısal sorun: ID normalizasyonu ("stu-" prefix bulaşığı).**

Kod boyunca `student_id` birden çok formda tutuluyor (`stu-X`, `X`, isim, sözleşme no) ve her sorgu bunu 5 yönlü OR zinciriyle çözmeye çalışıyor:

```sql
WHERE s.id = c.student_id
   OR s.id = ('stu-' || c.student_id)
   OR ('stu-' || s.id) = c.student_id
   OR s.sozlesme_no = c.sozlesme_no
   OR s.student_name = c.student_name      -- ← İSİM EŞLEŞTİRME
```

- `students.js:35-42`, `contracts.js:16-22`, `accounting.js` payment çözümlemesi — hepsinde aynı 5 yönlü OR zinciri var.
- **İsimle eşleştirme** (`student_name = student_name`) iki farklı gerçek öğrenciyi eşleştirir; silme kaskatları yanlış veriyi siler. 112 commit'in en az 10'u ("phantom contract", "duplicate contract", "121 count", "inflated 188 count", "resurrection") bu tek kök nedenin semptomlarıdır.
- `students.js` DELETE cascade'i `LOWER(student_name)` ile sözleşme/income/tahsilat siler → aynı ada sahip sağlıklı öğrencinin verisi de gider.

**Öneri (kök çözüm):** `stu-` prefix'li ID'leri tek seferlik migration ile temizle; her tabloda `student_id` → gerçek `students.id` olsun (yabancı anahtar + indeks); isim eşleştirmesini matching'den tamamen kaldır, yalnızca görüntülemede kullan. Bu yapılmadan her "fix" yama olmaktan öteye geçmez.

### 2.3 Mantık hataları

| # | Sorun | Konum |
|---|---|---|
| H1 | **Taksit planı iki farklı yerde, iki farklı mantıkla hesaplanıyor**: `utils.js computeInstallmentPlan` (backend, `due_date` tabanlı) ve `edesisAccountingService getInstallments` (frontend, sözleşme tarihi tabanlı). İki kaynak farklı sonuç üretebilir. | `utils.js`, `edesisAccountingService.js` |
| H2 | **Çifte yazım**: Bir işlemde hem frontend `_memory` + localStorage hem backend D1 yazılır; `students.paid_amount` hem payments SUM'ı ile hem de installments toplamıyla güncelleniyor → kaynaklar birbirinden sapabilir. | `accounting.js` vs `QuickActionModal.js` |
| H3 | **Yarış koşulu (race)**: idempotency guard tek taksit "zaten ödendi" durumunu yakalıyor, ama iki eşzamanlı talep `SELECT paid_amount` sonra `UPDATE` yaptığından aşırı tahsilat yazılabilir. `WHERE paid_amount + ? <= amount` koşullu UPDATE (optimistic lock) gerekli. | `accounting.js` POST /payments |
| H4 | `enrichStudent` dönem normalizasyonu katı: `2025-2026` öğrencileri "Mezun" etiketleniyor ama sorgular her yerde tüm dönemleri getiriyor → KPI'lar geçmiş dönemle şişiyor. | `utils.js:145+` |
| H5 | `getDynamicAccountingSummary` içinde `taksitlerCount = instRow?.cnt || 603` — **603 sabit fallback**; gerçek veri yoksa yanlış KPI gösterir. | `accounting.js:47` |
| H6 | `student_incomes.kalan_alacak` `MAX(0, brut - tahsilat)` ile güncelleniyor ama frontend servis kendi kopyasında bileşik alanları ayrı formülle tutuyor; tek doğruluk kaynağı net değil. | `accounting.js` + servis katmanı |

### 2.4 Performans & ölçeklenebilirlik

| # | Sorun | Konum |
|---|---|---|
| P1 | `/dashboard` tek GET'te tüm öğrenciler + sözleşmeler + tahsilatlar + giderler + öğretmenler JSON'a gömülüyor; localStorage'a da yazılıyor. Veri büyüdükçe 10MB+ payload ve kuota basınca sessiz `QuotaExceeded` riski. | `accounting.js GET /dashboard`, `App.js load()` |
| P2 | `students.js` POST içinde 10+ ayrı `db.prepare().run()` ( installment for döngüsü) — D1'de her biri ayrı round trip; tek `db.batch()` olmalı. | `students.js` |
| P3 | `contracts.js` POST aynı döngüsel yapıyı tekrarlıyor; students/contracts POST'larında ~%60 kod tekrarı (otomatik sözleşme+gelir+taksit üretimi iki kez yazılmış). | `contracts.js` |
| P4 | `LIKE '%search%'` + `LOWER()` indeks yok sayar. Küçük veride sorun değil; büyümede FTS5/normalize sütun gerekli. | `students.js` |
| P5 | `getNextSequence` her çağrıda `CREATE TABLE IF NOT EXISTS` çalıştırıyor (gereksiz I/O) ve **race condition** içeriyor: iki eşzamanlı istek aynı numara üstüne çıkabilir. | `utils.js` |

### 2.5 Kenar durumları

| # | Sorun | Konum |
|---|---|---|
| E1 | `parseCookies` `pair.split("=")` sonra ilk parçayı alıyor; değerde `=` varsa kesilir (base64 token riski). | `utils.js:60` |
| E2 | `atob/btoa` byte-byte döngüsü büyük dosyada bellek patlaması — 10MB sözleşme için. Chunked encoding gerekli (veya R2). | `students.js` upload |
| E3 | `toISOString().split("T")[0]` UTC kullanır — Türkiye'de gece yarısı civarı **bir gün geriden vade tarihi** üretir. `9aa478c` commit'inde timezone düzeltmesi yapılmış ama backend'de hâlâ UTC-dünyalı yerler var. | `students.js`, `contracts.js` |
| E4 | Axios/network hataları çoğunlukla `catch {}` içinde yutuluyor; kullanıcıya "kaydedildi" hissi verip arkada fail olabilir. | Servis katmanı |
| E5 | `purgeClientStorage` tek tuşla IndexedDB + ServiceWorker + cookie temizliği — PWA'da kullanıcı tüm offline veriyi kaybedebilir (onay dialogu var ama geri alınamaz). | `App.js` |

---

## 3. 🟡 ORTA DÜZEY BULGULAR

1. **Test asimetrisi**: 203 test var, ama tamamı client/servis katmanı. `academic.js` (583 satır), `exams.js`, `system.js` (306 satır) için backend test yok; `modular_api_router.test.js` duvar mock'lu.
2. **Katılan tüm sayfalarda sayı işaretleri**: `TEST_READY.md` "5 suite/76 test" yazıyor, gerçek sayı 21/203 — doküman bayat.
3. **Şema dağınıklığı**: `schema.sql` + `migration_contracts.sql` + `migration_phase1_installments.sql` — 3 ayrı şema kaynağı; D1'de gerçek şemanın hangisi olduğu doğrulanmıyor ( sistem router `system_backups` yalnızca veri snapshot).
4. `EdesisStudentModal` (961), `GelirDetayModal` (1777), `EdesisSozlesmeDetay` (1910) tek dosyada 3-4 bileşen büyüklüğünde; bölünmeye aday.
5. `README.md` içeriği "Here are your Instructions" — boş.
6. `frontend/package.json` içinde 60+ `resolutions` satırı güvenlik yamalarıyla uğraşıldığını gösteriyor; CRA (react-scripts 5) ömrünü tamamladı → Vite geçişi değerlendirilebilir.
7. Çalışma dizininde **commitlenmemiş 11 dosya** var (719 ekleme/215 silme) — mevcut iş kaybolmasın diye commitlenmeli.

---

## 4. 🟢 İYİ YAPILMIŞ OLARAK GÖRÜLENLER

- Cloudflare Pages Functions + D1 + domain router yaklaşımı temiz uygulanmış: `[[route]].js` dispatch, 404/errorResponse/CORS tutarlı.
- `db.batch()` ile ACID kullanımı (payment/cancel/delete cascade) doğru düşünülmüş; idempotency guard mevcut.
- SSOT dönüşümü (statik JSON'dan D1'e) tamamlanmış; `edesisService` stub'ları geriye dönük uyumluluk için bırakılmış.
- `schema.sql`'de `sozlesme_no UNIQUE`, `system_backups`, `audit_logs` sağlam.
- Test kültürü iyi: 203 test 5.3 sn'de bitiyor; craco jest hızı makul.

---

## 5. 📊 COMMIT DESENİ ANALİZİ

112 commit, 10 gün (2026-10-01 → 2026-10-10) — günde ~11 commit, yoğun düzeltme akışı:

| Desen | Sayı | Örnek |
|---|---|---|
| fix(...) | ~68 | duplicate contract, count düzeltmeleri, resurrection, phantom, filtre, cache bump |
| feat(...) | ~30 | SSOT faz 2-3-5, modülerleştirme, backup, senet/makbuz |
| refactor(...) | ~7 | monolith modularize, SSOT |
| test(...) | ~4 | student counts check, e2e regression |
| diğer | ~3 | — |

**Anlamı:** fix:feat oranı ~2:1. En çok tekrar eden fix temaları: (a) öğrenci↔sözleşme eşleşmesi, (b) duplicate/phantom kayıt, (c) ödeme toplamı sayımları (121/188/603). Hepsi 2.2'deki tek kök neden "ID normalizasyonu + isim eşleştirmesi"ne bağlanıyor.

---

## 6. 🗺️ AŞAMALI İYİLEŞTİRME PLANI (önerilen sıra)

### Faz 0 — Bugün, veri kaydırma yok (yarım gün)
1. Admin/personel parolasını koddan çıkar → `env.ADMIN_PASSWORD` / `env.STAFF_PASSWORD` (Pages secret). GitHub geçmişinde şifre kaldığı için parolaları **rotate et**.
2. `/auth/me` misafirde gerçek guest döndürsün (admin default olmasın).
3. Her mutasyon endpoint'e `requireRole(user, minRole)` kontrolü.

### Faz 1 — ID normalizasyonu migration (1-2 gün)
4. Tek seferlik script: tüm `contract.student_id`, `installments.student_id`, `payments.student_id` değerlerini `students.id` formatına normalize et.
5. Sözleşme/income matching'den **isim eşleştirmesini kaldır**; `students.id` bazlı eşleşme + indeks.
6. Kaskad silme işlemlerini ID bazlı hale getir.

### Faz 2 — API temizliği (2-3 gün)
7. `students.js` POST ve `contracts.js` POST'taki otomatik sözleşme+gelir+taksit üretimini **ortak fonksiyona** al ve `db.batch()` ile tek seferde yaz.
8. `computeInstallmentPlan` tek doğruluk kaynağı olsun (backend), frontend servis okuma yapar.
9. `GET /dashboard`'a alan seçimi / limit ekle; localStorage mirror boyuta bağlan.
10. `getNextSequence`'ı atomik `INSERT INTO system_sequences ... RETURNING` yapısına çevir; CREATE TABLE'ı migration'a taşı.
11. `POST /payments`'te koşullu UPDATE: `WHERE paid_amount + ? <= amount`.

### Faz 3 — Kalite (2 gün)
12. Axios interceptor: ağ hatası → kullanıcıya görünen toast; sessiz `catch {}` bloklarını azalt.
13. Sözleşme yüklemesini R2'ye taşı (D1 satır limitine takılma).
14. Backend router'lar için `vitest + miniflare` tabanlı test ekle (özellikle accounting ödeme akışı).
15. README ve TEST_READY'yi gerçek değerlerle güncelle.

### Faz 4 — İsteğe bağlı
16. CRA → Vite geçişi (build/CI hızlanır, 60+ resolutions geriler).
17. 1000+ satırlı modülleri parçala.

---

## 7. 🔎 ÖZET — En önemli 5

| # | Konu | Ne yapılacak |
|---|---|---|
| 1 | Kod içine gömülü şifreler | env'e taşı, parolaları rotate et |
| 2 | student_name üzerinden matching/silme | ID bazlı matching'e geç |
| 3 | 10+ round trip student/contract POST | Ortak fonksiyon + db.batch() |
| 4 | `|| 603` sabit fallback | Gerçek sayı, yoksa 0 |
| 5 | Auth guard mutasyonlarda yok | requireRole + guest default kaldır |

---

*Analiz, çalışma dizinindeki 11 commitlenmemiş değişikliği de içerir. Test suite tamamen geçiyor: 21/21 suite, 203/203 test (5.3 sn).*
