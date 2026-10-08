# İnegöl Çözüm Kurs — mevcut ürün ve inceleme durumu

## Orijinal kullanıcı isteği
> inegöl cozum kursu github projemdeki veritabansal fonskiyonal hatalar var bağlam hataları hepsini test edip çözüm planı hazırla

Kullanıcı tercihi: **Önce test ve öncelikli çözüm planı; bu aşamada ürün koduna düzeltme yapılmayacak.**

## Mimari kararlar / mevcut durum
- Kaynak: `/app` içindeki bağlı `inegol-cozum-kurs` deposu.
- Uygulama: React 19/CRA (`frontend/src/App.js`) ve Cloudflare Pages Functions (`frontend/functions/api/[[route]].js`); veri kaynağı Cloudflare D1/SQLite (`frontend/schema.sql`, `frontend/wrangler.toml`).
- Muhasebe ve öğrenci ekranlarının bir kısmı ayrıca paketlenmiş Edesis JSON'u ve tarayıcı `localStorage` kayıtlarını kullanıyor. Bunlar D1 ile otomatik olarak aynı kayıt kümesi değil.
- Bu çalışma ortamında `/app/backend` yok; supervisor'ın beklediği FastAPI servisi çalışmıyor. React önizlemesi açılıyor ama önizleme `/api` uçları 502; canlı Cloudflare D1 hakkında bundan sonuç çıkarılamaz.
- Önceki PRD'deki FastAPI/MongoDB bilgisi **bu checkout için güncel değildir**.

## İnceleme sırasında yapılanlar
- Üretim verisi değiştirilmedi ve uygulama kaynak koduna düzeltme uygulanmadı.
- 11 Jest paketi / 123 test geçti; çoğu yerel veri/fixture ile çalıştığı için gerçek D1 entegrasyonunu doğrulamaz.
- CI koşulunda derleme lint uyarıları nedeniyle başarısız, CI olmadan uyarılarla başarılı.
- Önizlemede masaüstü ve mobil giriş ekranı açıldı; `/api/auth/me`, `/api/status`, `/api/contracts/deleted-keys` 502.
- `schema.sql` yalnızca geçici bellek SQLite'ında denendi; örnek veride ilişki ve finansal tutarsızlıklar görüldü. Gerçek D1 satırları sorgulanmadı.
- Kanıt, risk, paket bazlı düzeltme sırası, salt okunur mutabakat sorguları ve finans/akademik modüller için 14 senaryolu kabul matrisi: [`VERITABANI_TEST_VE_COZUM_PLANI.md`](./VERITABANI_TEST_VE_COZUM_PLANI.md). Ayrıntılı önceki test raporu: `/app/test_reports/iteration_1.json`.

## Öncelikli backlog
### P0 — veri güvenliği ve ana akış
1. Cloudflare Functions + D1'i izole bir test ortamında erişilebilir kılıp önizlemenin 502 sınırını kaldırmak.
2. API okuma/yazma yollarında kimlik doğrulama ve role göre yetki kontrolü.
3. Tahsilatın çifte kaydedilmesini engellemek; öğrenci, gelir ve taksit toplamlarını tek işlemin sonucu olarak tutmak.
4. Öğrenci ücreti/ek hizmet/indirim hesabını tek tanım altında toplayıp sözleşme ile kalan borcu eşitlemek.

### P1 — veri bütünlüğü
1. D1'in gerçek (salt okunur) mutabakat raporunu çıkarmak ve örnek şemadaki eksik ilişkileri güvenli göçle düzeltmek.
2. Öğrenci/sözleşme oluşturma, düzenleme ve silmeyi sabit ID üzerinden tek kaynaklı ve işlemsel yapmak.
3. Boş D1 verisi için uydurma KPI rakamlarını kaldırıp vade/dönem hesaplarını doğrulamak.

### P2 — güvenilirlik ve bakım
1. Gerçek D1'e bağlı, izole test verili API + tarayıcı regresyon testleri ve CI derlemesi.
2. Geri yükleme, yedekleme ve raporlama hatalarının açıkça bildirilmesi; kesintiden geri dönüş denemesi.
3. Sınıf, öğretmen, program, sınav, yoklama, ödev, rehberlik ve belge ilişkilerini izole D1 kabul matrisinde doğrulama.

## Sonraki görevler
1. Öncelikle `/app/memory/VERITABANI_TEST_VE_COZUM_PLANI.md` içindeki P0 kabul ölçütleriyle izole D1 test ortamını açmak.
2. Gerçek veride yalnızca salt okunur tutarlılık sorgularını çalıştırıp şema göçünü yedek sonrası tasarlamak.
3. Kullanıcı düzeltme yetkisi verirse P0 değişikliklerini sırayla uygulayıp uçtan uca tekrar doğrulamak.