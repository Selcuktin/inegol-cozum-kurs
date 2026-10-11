# İnegöl Çözüm Kurs - Genel Altyapı ve Hata Analiz Raporu

Tarih: 2026-10-11
Kapsam: Kod değişikliği yapılmadan mevcut repo, commit geçmişi, Cloudflare altyapısı, test/çalıştırma durumu ve risk analizi.

---

## 1) Hızlı Özet (Executive Summary)

- Proje tek bir React SPA + Cloudflare Pages Functions + D1 SQLite mimarisi üzerinde çalışıyor.
- Son commit geçmişi yoğun şekilde "fix" odaklı; bu durum hızlı iterasyon var ama regresyon riski yüksek olduğunu gösteriyor.
- En kritik risk alanı **güvenlik**: auth/backup/export tarafında açık endpoint davranışları ve hardcoded giriş modeli.
- İkinci kritik alan **operasyonel stabilite**: bağımlılıkların özel bir hosttan gelmesi nedeniyle (`assets.emergent.sh`) kurulum kırılabiliyor.
- Üçüncü alan **bakım maliyeti**: büyük dosyalar ve iş kurallarının çok merkezi dosyalarda toplanması hata tekrarını artırıyor.

---

## 2) Mimari Görünüm

## Frontend
- Konum: `frontend/src/`
- Çatı: React 19 + CRACO + Tailwind/Radix + yoğun custom modüller
- Routing: hash tabanlı (`window.location.hash`) akış
- Durum: localStorage/cache odaklı güçlü client-state yaklaşımı

## Backend
- Konum: `frontend/functions/api/`
- Yapı: modüler route dispatcher (`[[route]].js` -> auth/students/contracts/accounting/academic/exams/system)
- Runtime: Cloudflare Pages Functions + D1

## Cloudflare
- Konum: `frontend/wrangler.toml`
- D1 binding mevcut (`DB`), Pages build output `build`
- Root `functions/api/[[route]].js` sadece frontend içindeki fonksiyona re-export yapıyor

---

## 3) Commit Geçmişi Analizi (main/FETCH_HEAD)

İncelenen son commitlerde pattern:
- Çok sayıda art arda `fix(...)` commit'i
- Öğrenci/sözleşme/tahsilat eşleşmeleri, print, cache, backup ve routing üzerinde sürekli düzeltme
- Önce refactor/modularization, sonra çok sayıda bugfix dalgası

Yorum:
- Kod hızlı gelişmiş, sonra gerçek kullanımda edge-case'ler çıkmış.
- Domain kuralları (öğrenci-sözleşme-tahsilat) kırılgan; merkezi doğrulama katmanı tam stabilize değil.

---

## 4) Kritik Riskler ve Olası Hata Kaynakları

## CRITICAL-1: Kimlik doğrulama modeli zayıf
Kanıt:
- `frontend/functions/api/routes/auth.js`
  - Hardcoded şifre seti (`ADMIN_PASSWORDS`, `STAFF_PASSWORD`)
  - `/auth/me` endpointinde user yoksa admin benzeri guest dönüşü

Etki:
- Yetkisiz erişim veya rol yükseltme riski.
- Gerçek prod güvenlik standartlarıyla uyumsuz.

## CRITICAL-2: Backup/restore/export yüzeyinde yetki kontrolü eksik
Kanıt:
- `frontend/functions/api/routes/system.js`
  - `/backup` GET/POST, `/backup/restore`, `/export/*`, `/users`, `/audit-logs` akışlarında kapsamlı admin gate her endpointte net değil.

Etki:
- Veri sızıntısı, yanlışlıkla/niyetli tam DB restore, operasyonel kesinti riski.

## HIGH-1: Kurulum bağımlılığı dış hosta bağlı ve kırılgan
Kanıt:
- `frontend/package.json` içindeki `@emergentbase/*` tgz bağımlılıkları
- `yarn install --frozen-lockfile` çıktısı: `getaddrinfo ENOTFOUND assets.emergent.sh`

Etki:
- CI/CD veya lokal geliştirme ortamı kolayca bloklanır.
- "craco not found" zincir hatası nedeniyle test/build doğrulanamaz.

## HIGH-2: PII/kurumsal veri tohumlama (seed) dosyasında
Kanıt:
- `frontend/schema.sql` içinde gerçek görünümlü telefon/email/ad kayıtları

Etki:
- KVKK/GDPR benzeri uyum riskleri
- Test/prod veri sınırlarının bulanıklaşması

## HIGH-3: Çok büyük dosya ve yoğun sorumluluk
Kanıt (seçili):
- `frontend/src/components/EdesisSozlesmeler.js` (~1936 satır)
- `frontend/src/components/MuhasebeV2Dashboard.js` (~1775 satır)
- `frontend/src/App.js` (~947 satır)
- `frontend/src/lib/edesisAccountingService.js` (~1045 satır)

Etki:
- Küçük değişiklikten sonra regressions
- Kod review/test kapsamı zorlaşır

## MEDIUM-1: Dokümantasyon ve gerçek durum arasında sapma
Kanıt:
- `README.md` minimal/boş sayılabilecek içerik
- `TEST_READY.md` (5 suite/76 test) ile repo test klasörü (20 test dosyası) arasında fark

Etki:
- Onboarding ve doğru durum takibi zorlaşır

## MEDIUM-2: CORS wildcard ve güvenlik sertleşmesi eksikliği
Kanıt:
- `frontend/functions/api/utils.js`: `Access-Control-Allow-Origin: *`

Etki:
- Özellikle auth-cookie/token stratejisiyle birlikte saldırı yüzeyi genişler.

---

## 5) Test/Build Sağlık Analizi

Yapılan denemeler:
- `yarn test --watchAll=false` -> `craco: not found`
- `yarn build` -> `craco: not found`
- Neden: dependency install kırılıyor (`assets.emergent.sh` DNS erişim hatası)

Sonuç:
- Bu koşulda repo "temiz kurulumdan çalıştırılabilir" durumda değil.
- Bu durum tek başına bir altyapı sorunu (geliştirme/CI güvenilirliği).

---

## 6) /speckit-analyze Notları (.specify içeriği ile karşılaştırma)

- `.specify/specs/codebase_modularization_and_stability/spec.md` ve `tasks.md` içinde tanımlanan hedeflerin bir kısmı yapılmış görünüyor (modüler dosyalar var), ama halen büyük dosyalar mevcut.
- Spec metni bazı satır/ölçek değerlerinde güncel koddan sapmış.

Sonuç:
- Spec "yön" olarak doğru; fakat "tamamlandı" kabulü için metrikler güncellenmeli ve doğrulama çıktıları tekrar üretilmeli.

---

## 7) /cloudflare Analizi

Olumlu:
- D1 entegrasyonu tanımlı, route modülerleşmiş.
- Günlük backup tetikleyen workflow mevcut (`.github/workflows/daily-backup.yml`).

Risk:
- Backup endpointi internete açıkken workflow içinden doğrudan çağrılıyor; endpoint tarafı güçlü yetki kontrolü zorunlu.
- Yedekleme/restore operasyonları ağır; rate-limit, authz ve audit sertleşmesi gerekli.

---

## 8) Önceliklendirilmiş Sağlam İyileştirme Planı (Kod değişikliği yok, yol haritası)

## P0 (Önce)
1. Auth modelini sertleştir:
   - Hardcoded şifreleri kaldır
   - `/auth/me` guest-admin fallback davranışını sonlandır
2. System endpointlerini role-gated hale getir:
   - `/backup*`, `/export/*`, `/users`, `/audit-logs` için net admin zorunluluğu
3. CORS ve token/cookie stratejisini production profile ile daralt

## P1
4. Bağımlılık tedarik riskini çöz:
   - `@emergentbase/*` için erişilebilirlik/ayna stratejisi
   - CI’de deterministic install doğrulaması
5. Test/build pipeline’ını zorunlu hale getir:
   - En az `test + build` GitHub Action workflow

## P2
6. Büyük dosyaları ikinci aşama modülerleştirme:
   - Özellikle sözleşme/muhasebe domainlerinde sorumluluk ayrımı
7. Domain integrity guardrail:
   - Öğrenci-sözleşme-taksit-tahsilat akışında tek kaynak doğrulama kuralları

## P3
8. Dokümantasyon doğrulama:
   - README, test raporu, spec metriklerini kodun gerçek haliyle hizala
9. Seed veriyi anonymize et ve env’e göre ayır

---

## 9) Sonuç

Proje fonksiyonel olarak güçlü bir ürün kapsamına sahip; ancak güvenlik sertleşmesi + bağımlılık/CI güvenilirliği + modüler bakım kabiliyeti aynı anda ele alınmazsa hata döngüsü devam eder. En doğru yaklaşım: **önce güvenlik ve çalıştırılabilirlik (P0-P1), sonra mimari sadeleştirme (P2-P3)**.
