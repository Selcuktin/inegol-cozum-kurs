# 19 Ekim 2026 geliştirme uygulaması

## Uygulanan düzeltmeler

- **Tahsilat/makbuz:** Bir taksitteki ayrı kısmi ödemeler tek “Makbuzlar” kontrolünde tutar, tarih, işlem kimliği ve iptal etiketiyle açılır. Sözleşme ve gelir ekranı aynı bileşeni kullanır. İptal geçmişi silinmez; aynı tutarlı gerçek ödemeler birleştirilmez. Birden fazla aktif ödeme varsa hangi makbuzun iptal edileceği açıkça seçilir. API belirsiz taksit iptalini `409 PAYMENT_REQUIRED` ile reddeder. Son geçerli makbuz referansı da iptal sonrasında düzeltilir.
- **F1:** Boş, sıfır, negatif ve kuruş hassasiyeti geçersiz tahsilat tutarı gönderilmez; ortak servis de doğrular.
- **F2:** Sözleşmeden EFT, kart, nakit ve senet tahsilatı uygun hesapla gönderilir.
- **F3:** Gelir detayındaki tahsilat, seçilen taksit ID/no değerlerini korur.
- **F4:** Farklı sözleşmelerin paralel plan okumaları birbirinin planını döndürmez; okuma sürümleri sorgu anahtarıyla ayrılır.
- **L1:** Dolgu/geçersiz kimlikler güçlü öğrenci eşleştirmesi sayılmaz. Sayısal kontrolleri geçen kimlikte de ad eşleşmesi aranır; aksi halde öğrenci no+ad kullanılır. Gerçek öğrenci kaydı kanıtı yerine yalnız optik kimlik varsayımı yapılmaz.
- **L2:** Şablonda kitapçık alanı varsa boş, çoklu veya belirsiz değerler satır numarasıyla reddedilir. Alanı olmayan tek kitapçıklı şablon açık biçimde A kullanır.
- **L3:** Dosya yanıtında yalnız son seçimin sonucu uygulanır; hatalı yeni yükleme eski dosyayı kaydedilebilir bırakmaz. Karne, veli bağlantısı ve iletişim okumalarında da eski ekran yanıtı korunur.
- **L4/L5:** Değerlendirme dışı sorular maksimum net/TASP/başarı paydasından çıkarılır. Etkin TASP aralığı geçersizse kayıt reddedilir. Güncel sınav türünün ders sayıları ayar ekranında görünür.
- **LGS ekleri:** Aynı dosya+ad+tarih için tekrar okuma uyarısı ve açık yeniden okuma onayı vardır; kayıp yanıt denemesi aynı işlem kimliğini korur. Tek karne paylaşımı kapatılabilir; yeniden açıldığında yeni token oluşur. Eski link geri etkinleşmez.
- **B1:** Büyük tablo JSON'u güvenli bind parçalarına bölünür; silme/ekleme yine tek atomik batch içindedir. 2.000 sonuçlu R2 yedeği geri yükleme, hata enjeksiyonunda rollback ve checksum bozulması testlidir.
- **B2/B3:** Yeni R2 yedeklerinde D1'de gövdeyi ikinci kez saklamak yerine manifest, gerçek UTF-8 boyutu ve SHA-256 tutulur. İndirme/restore bütünlük kontrolü yapar. Eski R2 yedeğinin boyutu bilinmiyorsa 0 KB diye gösterilmez. Tarih/sıra indeksi eklendi. Eski yedekler silinmedi.
- **S1 ilk katman:** Giriş 10 deneme/dakika/IP ile isolate içinde sınırlandırılır; 429/Retry-After görünürdür. Başarısız girişler her seferinde D1 audit INSERT oluşturmaz; güvenlik olayı platform loguna gider. Opsiyonel `LOGIN_RATE_LIMIT` binding'i desteklenir.
- **S2:** Site verilerini sıfırlama, anonim GET ile yapılamaz; yönetici oturumu ve same-origin POST gerekir.
- **CSP:** Dış/in-line script izni kaldırıldı; PWA kaydı aynı origin'deki ayrı dosyada. Oturum taşıma biçimi değiştirilmedi; özel API adresi akışı korunur.
- **Ürün sadeleştirme:** Kalıcılığı olmayan örnek adaylar, deterministik geçici portal şifreleri ve kaydetmeyen kayıt ayarları kaldırıldı. Optik ve ders programı korundu. Eski tanılama/sınav importları başlangıç paketinden ayrıldı. Tahsilat ve iptal modalları mevcut Radix dialog ile odak/klavye desteği kazandı.
- **Karne PDF:** Var olan kurum JPEG'i değiştirilmeden gömüldü; Türkçe font, logo, başarı çubukları, kurum karşılaştırması ve sabit sayfa numarası var. Mevcut PDF üreticisi genişletildi; yeni bağımlılık eklenmedi. Anonim örnek Poppler ile görüntülendi.

## D1 maliyeti

- Bir tahsilat sonrası üç tam snapshot yerine bir snapshot; öğrenci düzenleme/hızlı kayıt ek liste okumalarını paylaşır.
- LGS ekranı tek başına açılırken mali snapshot alınmaz. Mali ekran/işlem, arama veya tanılama açıldığında gerekli görüntü yüklenir.
- Sekmeler arası bildirim işlem yolunu taşır; sınav yazmaları finans ekranında gereksiz tam okuma yapmaz. Eski bildirim biçimiyle uyum korunur.
- Tek CSV yalnız ilgili domain sorgusunu çalıştırır.
- Yerel workerd ölçümü: vade sorgusu **1.542 → 479**, sözleşme listesi **18.895 → 1.074 rows_read**. Finansal çıktı/kuruş paritesi ve migration tekrarı testlidir. Günlük canlı hesap tasarruf yüzdesi bu fixture sonuçlarından çıkarılmaz.
- 2.000 sonuçlu gerçek yerel D1: import **2.022 rows_read**, sınav bundle **2.001**, tek veli iletişim okuması **2**. Bu CPU limiti veya bütün hesap tüketiminin ölçümü değildir.

## Şema ve yayın

`0008_read_efficiency_indexes.sql`, `0009_backup_metadata.sql`, `0010_lgs_import_lookup.sql` additive şema değişiklikleridir. Mali kayıt düzeltmez/silmez. Eski D1 şeması, yeni metadata öncesi kaynak şemadaki tüm kolonlarla karşılaştırılarak bir başlangıç geçmişi kaydedilir; 0001–0007 veri işlemleri yeniden çalıştırılmaz.

CI ana dal yayınından önce mevcut migration geçmişini denetler, yalnız bekleyen migration'ları uygular. Proje yayınları sıraya alınır. Üretimdeki commit'i içermeyen eski kaynak dalın yayını `ops/check-release-order.mjs` ile reddedilir. Manuel yayın için de aynı kontrol ve öncesinde doğrulanmış güvenlik yedeği gerekir. GitHub zamanlayıcısının 20:00 kesinlik garantisi yoktur; tamamlanan yedeğin kimliği/R2 durumu artifact olarak saklanır.

## Kontroller

`npm test -- --runInBand`, `CI=true npm run build`, `tests/audit_real_sqlite.mjs`, `tests/system_integrity.mjs`, `tests/admin_workflows.mjs`, `tests/income_indexes.mjs`, `tests/lgs_workflows.mjs`, `tests/development_fixes.mjs` ve gerçek yerel `tests/d1-query-budget.mjs` çalıştırılır. Son test, eski şema başlangıcından bekleyen migration'ların iki kez çağrılmasını da kontrol eder. Eski Python referansının D/Y/B/net değerleri korunur; bilinen boş-soru payda hatasının puanı artık bağımsız düzeltilmiş formülle doğrulanır.

Canlıda test tahsilatı/iptali/restore yapılmaz. Yayın sonrası mali tabloların sayı ve SHA-256 değerleri güvenlik yedeğiyle karşılaştırılır. İnceleme sırasında meşru kullanıcı değişikliği olursa kayıtlar eski yedeğe çevrilmez.

## Bilerek açık bırakılan sınırlar

- Isolate içi giriş limiti **dağıtık, hesap genelinde parola deneme koruması değildir**. Pages doğrudan Workers rate-limit binding'ini destekleyen listede değil. WAF/Turnstile veya ayrı Worker service binding ile küresel katman ayrıca yapılandırılmalı; bu yama kurulmuş gibi iddia etmez. [Pages binding kapsamı](https://developers.cloudflare.com/pages/functions/bindings/), [Workers rate limit](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- Eski yedekler için otomatik silme/saklama süresi uygulanmadı. Günlük/haftalık/aylık saklama tercihi belirlenmeden geri dönülemeyen toplu silme yapılmaz. Yeni gövdelerin R2'de tutulması ve manifest indeksi büyümenin D1 etkisini azaltır.
- Güncel audit'teki `braces` ve `sprintf-js` advisory'lerinde düzeltilmiş sürüm gösterilmiyor. Toplam 19 bağımlılık yolu uyarısı (11 high/8 moderate) devam eder; zorla alakasız major sürüm veya yeni derleme altyapısı eklenmedi. Lockfile değişmedi.
- Varsayılan LGS istatistikleri resmî 2026 kalibrasyonu olarak sunulmaz. Gerçek istatistik/katsayılar kurum tarafından girilmeli; yazılımın matematik testi resmî LGS onayı değildir.
- Yerel tarayıcı Work ayarlarında kapalı olduğundan gerçek mobil tarayıcı/klavye ve fiziksel yazıcı testi bu tur yapılamadı. jsdom, bağımsız PDF render ve SQLite/workerd kontrolleri bunların yerine geçtiği iddia edilmez.
- Tam sunucu sayfalaması ve bütün eski alan alias'larını kaldırmak ayrı kapsamlı dönüşümlerdir. Mevcut tam dışa aktarma/yazdırma ve atomik snapshot güvencelerini bozacak şekilde bu yayına sıkıştırılmadı. Yeni kritik yazma akışlarında doğru kayıt/taksit kimliği sağlandı.
