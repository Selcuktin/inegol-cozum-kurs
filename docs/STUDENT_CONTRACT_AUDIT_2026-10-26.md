# Öğrenci ve sözleşme tutarlılığı taraması — 26 Ekim 2026

## Kapsam ve neden

Boş DELETE gövdesinin JSON hatası vermesi önceki sürümde düzeltildi. Bu taramada öğrenci kaydı, öğrenci düzenleme, yeni sözleşme, sözleşme tutarı/taksit düzenleme, tahsilat, tahsilat iptali ve silme işlemlerinin ortak veri akışları incelendi. Değişikliklerin eski veriye dönmesi tek bir nedenden kaynaklanmıyordu: açık formun sürüm bilgisi, geç gelen istemci yanıtı ve eski kimlik/sözleşme bağlantıları ayrı sorunlardı.

## Düzeltilen sorunlar

| Bulgu | Sonuç ve uygulanan koruma |
| --- | --- |
| Arka plandaki yenileme açık öğrenci formunun çakışma başlangıcını ilerletebiliyordu. | Taslak açıldığı andaki kayıt korunur. Mali değişiklikler beş mali girdiyi birlikte karşılaştırır; arada sözleşme bağlantısı değişirse tüm işlem geri alınır. |
| Eski kayıt yanıtı daha yeni sunucu görüntüsünü tekrar ezebiliyordu. | Yetkili sunucu görüntüsü korunur; eski yanıt ve eski formdan tekrar yerel kayıt ekleme kaldırıldı. |
| Ek ücretin arayüz alanları API sürüm kontrolüne sızabiliyordu. | Yalnız kalıcı `extra_fees` alanı gönderilir; diğer özel ek ücretler korunur. |
| Yanıt kaybından sonraki öğrenci/sözleşme oluşturma tekrarı ikinci kayıt veya eski veriyle güncelleme riski taşıyordu. | Form başına sabit işlem kimliği kullanılır. Aynı işlem okunarak yanıtlanır; çelişen tekrar `409` verir. Eşzamanlı oluşturma kontrolü işlem içinde yapılır. |
| Yeni sözleşme sonrasında adla öğrenci eşleştiren ikinci profil yazımı vardı. | İkinci yazım kaldırıldı. Yeni öğrencinin telefon, sınıf, numara ve dönemi ilk atomik işlemde saklanır. Var olan öğrenci profili kendi düzenleme ekranından değiştirilir. |
| Eski `stu-` kimlikleri bazı mali düzenleme yollarında bulunamıyordu. | İki düzenleme yolu da eski kimliği destekler; tam kimlik önceliklidir. Başka dönem kaydı korunur. |
| Numarayla bağlı eski gelire tahsilat eklenip iptal edildiğinde gelir bakiyesi geri alınmayabiliyordu. | Alma ve iptal aynı aktif gelir eşleştirmesini kullanır; açılış bakiyesi ve silinmiş geçmiş korunur. |
| Mali düzenleme silinmiş gelir geçmişini de değiştirebiliyordu. | Ortak mali güncelleme yalnız aktif gelirleri değiştirir. Yeni taksitler mevcut aktif gelir bağlantısını kullanır. |
| Yalnız okul gibi profil alanı değiştirilirken veli telefonu değişebiliyordu. | Mevcut telefon korunur; otomatik tamamlama yalnız ilgili iletişim alanları açıkça değiştirildiğinde ve ana alan boşsa yapılır. |
| Makbuzu yeniden oluşturulmamış eski tahsilat bakiyesi sözleşme silme korumasından kaçabiliyordu. | Makbuz, taksit ve gelir bakiyesi birlikte kontrol edilir. Kontrol ile silme arasına tahsilat girerse atomik silme geri alınır. |
| Öğrenci silme kontrolünden sonra sözleşme eklenirse öğrenci kaydı silinebiliyordu. | İlişkili kayıt ve öğrenci sürümü kontrolü silmeyle aynı atomik işlemde yapılır. Araya giren sözleşme/tahsilat korunur, silme `409` verir. |
| Kuruş altı veya güvenli sayı sınırını aşan tutarlar kayıtlar arasında farklılaşabiliyordu. | Öğrenci, sözleşme ve taksit sınırlarında kontrol; taksit toplamında tam kuruş hesabı uygulanır. |
| Tahsilattan sonra gereksiz ikinci taksit isteğinin hatası tamamlanan işlemi başarısız gösterebiliyordu. | Mevcut ortak yenileme kullanılır; ek okuma kaldırıldı. |

## Doğrulama

- Jest: 35 test dosyası, 388 test başarılı. Açık taslak, eşzamanlı yenileme, ek ücret, çift gönderim, yanıt kaybı ve yeni veri önceliği kontrolleri dahil.
- Gerçek API yönlendiricisi + yerel SQLite: 96 akış testi; 57 sistem bütünlüğü kontrolü; 37 yönetici akışı; 31 LGS kontrolü; 9 geliştirme regresyonu; 3 gösterge paneli/parite kontrolü başarılı.
- Yeni 16 öğrenci ve 20 sözleşme sınır testi başarılı; CI yayın kapısına eklendi. Gerçek SQL işlemlerinde araya giren tahsilat, sözleşme geçişi, silme ve tekrar gönderme senaryoları çalıştırılır.
- Yerel gerçek D1/workerd okuma ölçümü: gösterge paneli 8 sorgu / 3.343 satır; mali parite korunuyor. Önceki 13 sorgu / 7.550 satırlık yol testte karşılaştırılıyor. Bu rakamlar sentetik veri ölçümüdür, canlı günlük tüketim tahmini değildir.
- Üretim derlemesi başarılı. Yeni bağımlılık veya şema göçü yok.

## Canlı verinin salt okunur incelemesi

Yayın öncesi R2'ye ve yerel özel yedek klasörüne alınan görüntü: 113 öğrenci, 135 sözleşme, 136 gelir, 790 taksit, 202 tahsilat, 1 gider.

Bu görüntüde sahipsiz aktif sözleşme, aynı öğrenci/dönemde yinelenen aktif sözleşme, geçersiz taksit bakiyesi, eksik sözleşme/taksit hedefine bağlı aktif ödeme veya çift eski/yeni öğrenci kimliği bulunmadı.

- `SZL202600174` silinmiş durumdadır. Öğrenci kartında eski sözleşme numarası tutuluyor; bu numaraya mali düzenleme yapıldığında sessizce bağımsız ücret yazmak yerine mutabakat hatası verilir. Yeni sözleşme oluşturma bağlantıyı atomik olarak yeniler.
- `SZL202600097` ve `SZL202600049`: eski kaynakta 1 TL, tamamen ödenmiş gelir, taksit planı yok. Gerçek bedel/tarih kanıtı olmadan mali kayıt veya yeni tahsilat üretilmedi. Bunlar veri inceleme notudur; 1 TL'nin gerçek eğitim bedeli olduğu doğrulanmış değildir.

## Sınırlar

Yazma/silme/yarış testleri sentetik yerel veride çalıştırılır. Canlıda gerçek müşteriye ait sözleşme veya tahsilat test amacıyla değiştirilmez. Eşzamanlı gerçek cihaz oturumları ve her tarayıcının görsel davranışı bu testlerin kanıt kapsamı değildir. Kod taraması ve geçen testler gelecekte hiç hata olmayacağını göstermez.

İptal, gerçek para iadesi veya başka hesaba aktarım üretmez; bu hareketlerin ayrı mali dayanağı gerekir. Geçmiş verinin doğruluğu, mevcut alanların birbirleriyle tutarlı görünmesinden tek başına kanıtlanamaz.
