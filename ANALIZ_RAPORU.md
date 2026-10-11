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
| G5 | **Backup/Restore anonim ve kimlik doğrulamasız**: `POST /backup` ve `POST /backup/restore` hiçbir token/rol kontrolü yapmıyor (`system.js:207,233`). GitHub Actions cron'u (`daily-backup.yml`) secret'siz curl atıyor; CORS `*` ile birleşince **herkes production DB'yi snapshot edebilir veya restore ile silebilir**. | `system.js:207,233`, `.github/workflows/daily-backup.yml` | Veri silintisi / ele geçirme |
| G6 | **Restore işlemi transactional değil**: Backup `/backup/restore` her tabloyu `DELETE FROM t` + satır satır `INSERT` (10+ round trip) yapıyor; db.batch() YOK, try-catch ile hata yutuluyor. Ortada sıkıntı da: pre-restore yedeği kaydediliyor ama **işlem yarısında hata olursa production DB yarısı boş kalır** → kaydedilmeyen satırlar gider. | `system.js:268-288` | Yarım-silinmiş production verisi |

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

### 2.3b Deployment & CI/CD eksikleri

| # | Sorun | Konum |
|---|---|---|
| D1 | **Deploy pipeline yok**: Sadece `daily-backup.yml` var; deploy elle `craco build && npx wrangler pages deploy build --commit-dirty=true` ile yapılıyor. `--commit-dirty=true` + elle deploy → hangi kodun yayında olduğu git'ten doğrulanamıyor; CI'da test/verify aden dağıtım pipeline'ı yok. | `frontend/package.json:67`, `.github/workflows/` |
| D2 | **Migration klasörü yok**: `schema.sql` + `migration_*.sql` repo kökte duruyor; `wrangler d1 migrations` yapısı kurulmamış. Yeni tablo/sütun geldiğinde production D1'e şemayı elle execute etmek unutulabilir — "no such table" hatalarını yaratır. | repo kökü |
| D3 | `compatibility_date = "2024-09-01"` bayat — güncel runtime davranışı ve D1 yeni özelliklerinden geri kalır. | `frontend/wrangler.toml:3` |
| D4 | **Backup snapshot'ı tek satırda JSON olarak D1'e yazılır** (`snapshot_data` TEXT): 17 tablo × veri büyüdüğünde D1 ~2MB satır limitine çarpar; o günün backup'ı sessizce tamamlanamamış olur. Ayrıca snapshot sonrası `SELECT * FROM " + t` döngüsü tablo adını string birleştirme ile kuruyor — hardcoded liste ile kontrol altında ama pattern kırılgan. | `system.js:173,216`, `BACKUP_TABLES` |

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
| E5 | `console.log`/`console.warn`/`console.error` üretim kodunda 38+ noktada — edge tersibilirása eski log sızmaları; SPA'da kullanıcı verisi loglanıyor olabilir (öğrenci adı, araama terimleri). `terser drop_console` veya build-time strip önerilir. | frontend/src (tests hariç) |
| E6 | Backup API cron security: GitHub Actions curl'i secret'siz — bu tesadüfen "çalışıyor", ama secret rotasyonu/iptali backup'ı sessiz öldürür; ayrıca POST auth'suz olduğundan (G5) bilenler manuel snapshot da üretebilir. | `.github/workflows/daily-backup.yml` |
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
4. **Backup/restore'ı auth altına al** (G5): `POST /backup` ve `POST /backup/restore` admin rolü istesin; GitHub Actions cron'unu `Authorization: Bearer ${{ secrets.BACKUP_TOKEN }}` ile güçlendir ve backend'de token doğrula.
5. **Restore'u `db.batch()` ile transactional hale getir** (G6) — yarısı silinmiş bırakmasın.
6. **`/users GET` ve `/audit-logs GET`'e admin rol kontrolü ekle** (EK-2 teyidi) — okuma endpoint'leri de geniş açık.
7. **`schema.sql` seed'ini temiz PII'siz veriyle değiştir** (EK-2 S2 / KVKK) — isim/telefon/e-postaları örnek verilerle değiştir ya da seed'i repo'dan çıkar.

### Faz 1 — ID normalizasyonu migration (1-2 gün)
4. Tek seferlik script: tüm `contract.student_id`, `installments.student_id`, `payments.student_id` değerlerini `students.id` formatına normalize et.
5. Sözleşme/income matching'den **isim eşleştirmesini kaldır**; `students.id` bazlı eşleşme + indeks.
6. Kaskad silme işlemlerini ID bazlı hale getir.

### Faz 1b — Deployment altyapısı (1 gün)
8. Migration klasörü kur: `frontend/migrations/0001_init.sql` …; `wrangler d1 migrations apply DB --remote` pipeline'a girsin (D2).
9. GitHub Actions deploy workflow'u: test → build → `wrangler pages deploy` (commit-dirty olmadan) → production.
10. `compatibility_date` güncelle (D3).
11. Backup snapshot'ı D1 satırı yerine R2 objesine yaz; D1'e yalnızca metadata/pointer bırak (D4, G4 ile aynı R2 kurulumu).
12. Production console.log'ları `terser drop_console` veya build-time strip ile temizle (E5).
13. **`@emergentbase/*` bağımlılıklarını devDeps'e indir/optional yap ve CI'da temiz install doğrula** (EK-2 S1) — `assets.emergent.sh` hostu uptime garantisi olmadan temiz kurulumu kırıyor; `auth.emergentagent.com` login linkini de temizle.

### Faz 2 — API temizliği (2-3 gün)
12. `students.js` POST'taki ve `contracts.js` POST'taki otomatik sözleşme+gelir+taksit üretimini **ortak fonksiyona** al ve `db.batch()` ile tek seferde yaz.
13. `computeInstallmentPlan` tek doğruluk kaynağı olsun (backend), frontend servis okuma yapar.
14. `GET /dashboard`'a alan seçimi / limit ekle; localStorage mirror boyuta bağlan.
15. `getNextSequence`'ı atomik `INSERT INTO system_sequences ... RETURNING` yapısına çevir; CREATE TABLE'ı migration'a taşı.
16. `POST /payments`'te koşullu UPDATE: `WHERE paid_amount + ? <= amount`.

### Faz 3 — Kalite (2 gün)
17. Axios interceptor: ağ hatası → kullanıcıya görünen toast; sessiz `catch {}` bloklarını azalt.
18. Sözleşme yüklemesini R2'ye taşı (D1 satır limitine takılma).
19. Backend router'lar için `vitest + miniflare` tabanlı test ekle (özellikle accounting ödeme akışı).
20. README ve TEST_READY'yi gerçek değerlerle güncelle.

### Faz 4 — İsteğe bağlı
21. CRA → Vite geçişi (build/CI hızlanır, 60+ resolutions geriler).
22. 1000+ satırlı modülleri parçala.

---

## 7. 🔎 ÖZET — En önemli 6

| # | Konu | Ne yapılacak |
|---|---|---|
| 1 | Kod içine gömülü şifreler | env'e taşı, parolaları rotate et |
| 2 | Backup/restore anonim + transactional değil | Auth + db.batch() (G5/G6) |
| 3 | student_name üzerinden matching/silme | ID bazlı matching'e geç |
| 4 | Deploy pipeline ve D1 migrations yok | CI/CD + migrations klasörü |
| 5 | 10+ round trip student/contract POST | Ortak fonksiyon + db.batch() |
| 6 | `|| 603` sabit fallback | Gerçek sayı, yoksa 0 |

---

*Analiz, çalışma dizinindeki 11 commitlenmemiş değişikliği de içerir. Test suite tamamen geçiyor: 21/21 suite, 203/203 test (5.3 sn).*

---

## 8. 📎 EK — İkinci AI Raporundan Doğrulanıp Entegre Edilenler (2026-10-11)

Bu EK bölümü, ikinci bir agentın hazırladığı karşılaştırma raporunun bu projeye göre doğrulanması sonucu oluşturulmuştur.

Karşılaştırma için alınan ikinci agent raporu incelendi. Raporun büyük kısmı bu projeye **spesifik değil** (Next.js App Router, Prisma/Drizzle ORM, "use client" hydration hataları, kurs video yükleme/presigned URL, TUS protokolü — **bu projede hiçbiri yok**; proje CRA/craco + Pages Functions + doğrudan D1 SQL kullanıyor). Ancak doğrulama sonrası, kod üzerinde teyit edilen **5 gerçek bulgu** bu rapora entegre edildi:

### Entegre Edilen Doğrulanmış Bulgu

**1. Backup/Restore endpoint'leri anonim ve transactional değil (YENİ KRİTİK — G5/G6 olarak eklendi):**
- `POST /backup` ve `POST /backup/restore` hiçbir token/rol kontrolü yapmıyor (`system.js:207,233`).
- Mevcut `daily-backup.yml` GitHub Actions workflow'u secret'siz anonim curl atıyor (`https://inegol-cozum-kurs.pages.dev/api/backup`) — şu an çalışıyor çünkü gerekli bir kontrol yok.
- Kritik risk: CORS `*` ile birleşince, **herhangi biri** tüm production veritabanını snapshot edebilir veya restore ile silebilir/yeniden yükleyebilir.

**2. Restore process'i transactional değil (G6):** Her tablo `DELETE FROM` + satır satır `INSERT` (10+ round trip, db.batch() yok, try-catch hata siliyor). Yarıda hata olursa production DB yarısı boş kalır.

**3. Migration klasörü yok (D2):** `schema.sql` + `migration_*.sql` repo kökte duruyor; `wrangler d1 migrations` yapısı kurulmamış. Yeni şema değişikliğinde production D1'e elle execute etmek unutulabilir — bu, diğer raporda belirtildiği gibi "no such table" hatalarını doğrudan yaratır.

**4. `compatibility_date = "2024-09-01"` bayat (D3):** `frontend/wrangler.toml` güncel runtime davranışından geri kalıyor; `nodejs_compat` flag'i ve D1 yeni özelliklerinin denemelerine kapatır.

**5. `console.log` miktarı (E5):** Üretim kodunda (tests hariç) 38+ `console.log/warn/error` nokta var. SPA'da kullanıcı kişisel verisi loglanıyor olabilir; build-time strip önerilir. (diğer raporun "console temizliği" önerisi doğruydu)

### Diğer Rapordan Elenenler (Bu Projede Geçerli Olmayanlar)

| İddia | Doğrulama Sonucu |
|---|---|
| Next.js App Router / "use client" hydration | ❌ CRA/craco + kendine özgü hash routing, Next.js yok |
| Prisma → Drizzle ORM geçişi | ❌ Proje ORM'siz, doğrudan D1 raw SQL (`db.prepare`) çalışıyor |
| R2 presigned URL CORS | ❌ R2 henüz hiç kullanılmıyor (öneri: eklenmeli — G4) |
| Video yükleme / TUS protokolü | ❌ Kurs videosu/yükleme iş akışı yok |
| `fs`/Node-native modül import | ✅ Doğrulandı: backend'de Node-only import yok, Workers-safe ES modules kullanılmış — bu konuda sorun yok |

### Eklenen Faz: 1b — Deployment Altyapısı

Diğer raporun "CI/CD + migration" vurgusu doğru; rapora **Faz 1b** olarak işlendi:

```yaml
# .github/workflows/deploy.yml (önerilen yaklaşım)
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: yarn }
      - run: cd frontend && yarn install --frozen-lockfile
      - run: cd frontend && CI=true yarn test --watchAll=false
      - run: cd frontend && yarn build
      - run: npx wrangler d1 migrations apply DB --remote
        env: { CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }} }
      - run: cd frontend && npx wrangler pages deploy build --project-name inegol-cozum-kurs
        env: { CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }} }
```

ve backup cron'unun güvenli hali:

```yaml
# daily-backup.yml (düzeltme)
- name: Trigger Daily Backup
  run: |
    curl -s -f -X POST "$URL/api/backup" \
      -H "Authorization: Bearer ${{ secrets.BACKUP_TOKEN }}" \
      -H 'Content-Type: application/json' \
      -d '{"notes": "GitHub Actions 20:00 TRT"}'
```

Backend'de `BACKUP_TOKEN` env secret'ı doğrulacak; auth'suz hali kapatılmalı. Ek olarak (G5) admin rolü kontrolü de istensin.

---

## 9. 📎 EK-2 — Üçüncü AI Raporundan Doğrulanıp Entegre Edilenler (2026-10-11)

Üçüncü agent raporu ("Genel Altyapı ve Hata Analiz Raporu") incelendi. Bu rapor ilk iki raporun bulgularının çoğunu teyit ediyor (hardcoded şifreler, backup auth, CORS wildcard, büyük dosyalar, README bayatlığı) — bunlar zaten G1/G2/G3 ve Orta Düzey başlıklarında mevcut. **Yeni doğrulanan 3 bulgu** eklendi:

### Yeni Doğrulanmış Bulgu

**1. ✅ HIGH — `@emergentbase/*` bağımlılıkları dış hosta bağımlı ve temiz kurulumu kırıyor (YENİ — S1):**
`frontend/package.json:84-85`:
```json
"@emergentbase/overlay": "https://assets.emergent.sh/npm/emergentbase-overlay-0.1.29.tgz",
"@emergentbase/visual-edits": "https://assets.emergent.sh/npm/emergentbase-visual-edits-1.0.13.tgz"
```
Bu iki paket `assets.emergent.sh`'den tar.gz olarak çekiliyor — **üçüncü raporun `ENOTFOUND` gözlemi gerçek** (bu host, Emergent AI platformunun özel deps hostu; uptime garantisi yok).
- **Etki:** Temiz clone → `yarn install` kırılır → `craco not found` → hiçbir test/build koşamaz. CI/CD ve yeni geliştirici onboarding bloklanır.
- **Önemli bağlam (bizim tespit):** Kod içinde bu paketler **yalnızca `craco.config.js:74-92`'de dev-server overlay için** kullanılıyor ve `fail-open` tasarlanmış (`DISABLE_EMERGENT_OVERLAY=true` desteği + try-catch). Üretim build'inde gerekli değil.
- **Ayrıca:** `AuthAndNav.js:127`'de eks 3. parti login hostu var (`auth.emergentagent.com`) —Login ekranında SSL/redirect kırılma riski (temel auth akışı buna bağlı, çift mekanizma: quick-login + bu link).
- **Çözüm:** `@emergentbase/*`'ı devDependencies'den çıkar veya optional yap (overlay yalnızca dev-server'da kullanılıyor, fail-open). CI'da temiz install doğrula. `auth.emergentagent.com` linkini kaldır veya gerçek OAuth flow'una taşı.

**2. ✅ HIGH — `schema.sql` içinde gerçek PII var (YENİ — P6 / KVKK):**
- `frontend/schema.sql:232+`: Gerçek görünümlü telefon numaraları (`'0532 440 21 18'`), öğrenci/veli ad-soyadları ("Eylül Yılmaz", "Arda Demir")
- `frontend/schema.sql:246-249`: **Gerçek görünümlü e-posta ve yönetici adları** (`kayrasemihseymen@gmail.com`, `Semih Seymen`)
- `frontend/schema.sql:419+`: Sözleşme seed'lerinde ad, sınıf, tutar bilgileri + **Azure blob URL'leri** (`sinavzastoragewest.blob.core.windows.net`)

Repo GitHub'daysa bu **KVKK/GDPR riski** — gerçek görünümlü kişisel verinin kodla dağıtılması. Ya temiz seed (`student-001/002`, `ornek@ornek.com`) ile değiştir, ya seed'i repo'dan çıkar ve `wrangler d1 execute` ile yönet.

**3. ✅ MEDIUM — `.specify` spec metrikleri gerçek kodla uyumsuz (YENİ):**
`.specify/specs/codebase_modularization_and_stability/` altında `spec.md/plan.md/tasks.md` mevcut; ancak "tamamlandı" kabul metrikleri bayat satır sayıları içeriyor — güncel kod ölçüleriyle (örn. 203 test, güncel dosya boyutları) uyumsuz.
- **Çözüm:** Spec metriklerini güncel kod ölçüleriyle (örn. satır sayıları, test sayısı 203) hizalayın.

### Üçüncü Raporun Teyit Ettiği Kapalı Konu

| İddia | Doğrulama Sonucu |
|---|---|
| Hardcoded şifreler / guest-admin | ✅ Zaten G1/G2 — Rapor dedüp ediyor |
| Backup auth eksik | ✅ Zaten G5 (Faz 0 maddeleri) — doğruluyor |
| CORS wildcard | ✅ Zaten G3 |
| Büyük dosyalar (EdesisSozlesmeler ~1936, MuhasebeV2Dashboard ~1775) | ✅ Zaten Orta Düzey §4 |
| Mock testsayıcı / README bayat | ✅ Zaten Orta Düzey §3 |
| `/users`, `/audit-logs` role-gated sınırlı | ✅ Kısmi doğru: `/users/role` rol kontrolü var (system.js:66-71), ama `/users GET` ve `/audit-logs GET` okuma endpoint'leri geniş açık; Faz 0 #3 kapsamına eklendi |

### Güncellenmiş Özet — En Önemli Ekleme

| # (Özet §7'ye ilave) | Konu | Ne yapılacak |
|---|---|---|
| 7 | `assets.emergent.sh` temiz kurulum kırıyor | Bağımlılıyı devDeps'e indir veya optional yap; CI'da temiz install doğrula (S1) |
| 8 | `schema.sql` gerçek PII (KVKK) | Temiz seed verisiyle değiştir (S2) |
| 9 | `auth.emergentagent.com` login çakışması | Quick-login dışındaki login akışını temizle (S3) |
