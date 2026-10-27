# Deneme analizi ve karne

Ana menüde **Deneme Sınavları & Karne** bölümünü açın. FMT şablonunu ve sınav türünü seçip optik okuyucunun TXT/DAT çıktısını yükleyin. Ders alanlarını, kitapçıkları ve cevap anahtarını kontrol ettikten sonra hesaplayın. Varsayılan LGS ortalama/standart sapma değerleri tahminidir; resmi değerler biliniyorsa Puanlama Ayarları bölümünde güncellenmelidir. Hesaplanan puanlar resmi LGS sonucu değildir.

- A/B/C/D kitapçıkları, 3/4 yanlış kuralı ve yanlışın doğruyu götürmediği puanlama desteklenir. `X`/`*` iptal soruyu herkese doğru sayar; anahtardaki boş konum değerlendirilmez. Farklı kitapçık için tam anahtar veya A ile açık soru eşleştirmesi gerekir. Eşleştirilmemiş kitapçıklar birleşik soru analizine katılmaz.
- Kitapçık alanı varsa boş/çoklu işaret A varsayılmaz; satır düzeltilmelidir. Boş anahtar konumu puan ve başarı paydasından da çıkarılır. TASP'ın otomatik değerleri hesaplandıktan sonra alt/üst aralık doğrulanır.
- Sınav sonuçları, ders/şube/soru analizi, bireysel gelişim, PDF liste, bireysel/toplu/şube PDF ve gerçek XLSX çıktısı vardır. Sonuç arama/filtreleme/sayfalama yeni veritabanı sorgusu yapmaz.
- Veli bağlantısı yalnızca yöneticinin paylaşım düğmesiyle etkinleşir. Bağlantıya sahip kişi ilgili karneyi açabilir; TC, telefon, diğer öğrenciler ve kurumun ham verileri paylaşılmaz. WhatsApp bağlantısı veya e-posta taslağı açılır; gönderimi yönetici tamamlar. Sunucudan otomatik e-posta gönderimi yapılandırılmamıştır.
- Paylaşımı Kapat eski bağlantıyı geçersiz kılar; yeniden paylaşıldığında farklı bağlantı oluşur. Dolgu/geçersiz T.C. değerleri iletişim/gelişim eşleştirmesinde kullanılmaz.

## Kalıcılık ve maliyet

Deneme açıldığında **Deneme Analizi** sekmesinde grafikli özet gösterilir: derslerin net başarı yüzdeleri, ortalama doğru/yanlış/boş dağılımı, standart sapmalı puan dağılımı ve şube karşılaştırması. Şube grafiği toplam net veya iki puan türü arasında değiştirilebilir; kesikli çizgi kurum ortalamasını gösterir. Negatif net yüzdeleri korunur. Kesin sayılar grafik altındaki açılır ayrıntılarda, öğrenci listesi **Sonuçlar** sekmesindedir. Eski yorumlar **Sıralama ve kayıtlı değerlendirme** altında korunur.

**Yazdır / PDF Kaydet**, yalnız grafikli analiz özetini tarayıcıdan yazdırır; üstteki **PDF Liste** öğrenci sonuç listesini, **Tüm Karneler** ise bireysel karneleri üretmeye devam eder. Grafikler mevcut detay yanıtındaki analizden oluşturulur; sekme ve grafik ölçüsü değiştirmek yeni D1 sorgusu veya yapay zekâ isteği göndermez.

`/api/lgs/*` işlemleri mevcut yönetici oturumunu kullanır. MongoDB/Python servisi veya ayrı demo giriş sistemi kullanılmaz. Yeni veriler D1 içindeki `lgs_templates`, `lgs_exam_types`, `lgs_exams`, `lgs_results`, `lgs_contacts` tablolarında saklanır ve otomatik yedeğe dahildir. Eski `exams`/`exam_results` geçmişi ve mali kayıtlar korunur; eski sınav ekranları ana iş akışından kaldırılmıştır. Dosyaların fiziksel optik cihazda okunması cihazın kendi yazılımıyla yapılır; uygulama FMT tanımını ve üretilmiş veri dosyasını işler.

Sınav yapılandırması, sonuçları ve hazır analiz aynı atomik D1 batch işleminde yazılır. Sürüm uyuşmazlığı 409 döndürür; kullanıcı güncel kaydı yeniden açar. İçe aktarma işlem kimliği yanıt kaybolduğunda mükerrer sınav oluşmasını önler. Tekrar hesaplama mevcut sonuç kimliklerini, veli bağlantılarını ve iletişim bilgilerini korur. Kayıtlı sınav, şablon sonradan değiştirilse bile kendi şablon kopyasını kullanır. Sınav silme arşivleme yapar; ham veri ve sonuçları fiziksel olarak silmez ve paylaşımı kapatır.

Analiz yalnızca kayıt/değişiklik anında hesaplanır. Detay ekranı seçili sınav ve indeksli sonuçları tek API yanıtında alır. Bireysel karne tüm sonuçları taramaz; veli bağlantısı benzersiz indeksle çözülür. Liste metadata sayfaları 100 sınavla sınırlıdır. İçe aktarma sınırı 1 MB / 2.000 satır, toplam 500 soru; 100 öğrenci başına bir toplu SQL yazımıdır. Yerel 2.000 öğrenci testi 26 SQL sorgusu kullanır; bu, 26 satır okunduğu anlamına gelmez. Gerçek Cloudflare CPU/kota tüketimi veri boyutuna ve hesap planına bağlıdır.

## Kurulum ve kontroller

Yeni kurulum `frontend/schema.sql` kullanır. Var olan kurulumda yalnızca `frontend/migrations/0007_lgs_analysis.sql` uygulanır; geçmiş migration dosyaları topluca tekrar uygulanmaz. Yeni tablolar idempotent oluşturulur, yalnızca şablon ve puanlama yapılandırmaları eklenir. Örnek TXT tamamen anonimdir.

19 Ekim sonrası mevcut kurulumlar, doğrulanmış migration geçmişi üzerinden yalnız bekleyen 0008–0010 adımlarını uygular. Aynı ad/tarih/dosya yeniden okunurken uyarı çıkar; açık onayla ayrı sınav oluşturulabilir. Karne PDF'si kurum logosunu ve ders başarı çubuklarını içerir.

Node 22 ve üzeri:

```sh
node tests/lgs_workflows.mjs
cd frontend
npm test -- --runInBand
npm run build
```

İzole SQLite kontrolleri Python referans puanlaması, çift gönderim, eşzamanlı ayar kaydı, hata enjeksiyonuyla transaction geri alma, eski şablon kopyası, paylaşım mahremiyeti, iletişim sürümleri, arşivleme, yedek/geri yükleme, multipart FMT/veri yükleme, PDF/XLSX ve büyük listeleri kapsar. Finansal testler ayrı veri üzerinde çalışır; test öğrencileri canlıya yüklenmez.
