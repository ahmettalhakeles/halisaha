# Halı Saha — Codex Çalışma Rehberi

## Proje bağlamı

- Yerel çalışma kopyası: `C:\Users\Excalibur\OneDrive\Desktop\halisaha`
- GitHub deposu: `ahmettalhakeles/halisaha`
- Canlı ortam: Railway üzerinde çalışan Halı Saha rezervasyon sitesi.
- Uygulama: Express + MySQL arka ucu, statik HTML/CSS/JavaScript ön yüzü.
- Giriş noktası: `server/index.js`; Railway başlangıç komutu da bu dosyayı çalıştırır.
- Mimari ve API ayrıntıları için önce `MIMARI_DOKUMAN.md` dosyasını incele.

## Çalışma biçimi

- Varsayılan olarak tek bir lider ajan görevi uçtan uca yürütür.
- Ödeme, kimlik doğrulama, rezervasyon veri bütünlüğü, güvenlik veya yayıma yakın değişikliklerde bağımsız bir inceleme ajanı kullan.
- Paralel ajanları yalnızca dosya ve sorumluluk sınırları açık, bağımsız büyük işler için kullan. Bir ajan sonuçları birleştirir ve doğrular.
- Önce ilgili akışı ve etkilenen API/arayüz dosyalarını bul; sonra küçük, odaklı değişiklik yap.

## Güvenlik ve veri kuralları

- `.env` içeriğini, Railway belirteçlerini, veritabanı parolalarını veya diğer gizli değerleri okuma, paylaşma, commitleme ya da sohbete ekleme.
- Gizli ayarlar yalnızca yerel `.env` ve Railway environment variables içinde kalır.
- Rezervasyon değişikliklerinde çift rezervasyon, zaman dilimi/tarih uyumu ve eşzamanlı istek risklerini kontrol et.
- Ödeme değişikliklerinde mevcut doğrulama, yetkilendirme ve idempotency/tekrar istek davranışını koru; belirsiz durumda önce plan sun.
- Kimlik doğrulama değişikliklerinde oturum, yetki kontrolü, parola güvenliği ve rate limiting etkisini incele.

## Doğrulama ve yayımlama

- Her değişiklikte ilgili API veya kullanıcı akışını yerelde doğrula.
- Rezervasyon, ödeme ve kimlik doğrulama değişikliklerine başarısız/negatif senaryolar ekle veya manuel olarak test et.
- Railway'e göndermeden önce `/health` uç noktasını, etkilenen temel kullanıcı akışını ve canlı hata kayıtlarını kontrol et.
- `railway.json` ve `package.json` başlangıç komutlarıyla uyumsuz değişiklik yapma.
- Mevcut kodda test komutu tanımlı değilse, çalıştırılamayan test varmış gibi davranma; gerçekleştirilen manuel kontrolleri açıkça raporla.

## Yararlı Codex yetenekleri

- Kod tabanı araması ve etki analizi için `codebase-memory-mcp` kullanılabilir. Yeni bir Codex oturumunda projeyi indeksle.
- Canlı site ve yayımdan önceki akış kontrolleri için Browser kullan.
- Rezervasyon akışı, metrik veya yönetici paneli tasarımı anlaşılmadığında görselleştirme kullan.
- Railway mevcut dağıtım hedefidir; alternatif bir barındırma platformuna geçiş önermeden önce kullanıcı onayı al.

## Zorunlu regresyon korumasi

- Her kod, yapilandirma, sema, API, frontend, backend, test, build veya deployment degisikliginde `.agents/skills/regression-guard/SKILL.md` skill'ini calismaya baslamadan once yukle ve uygula.
- Skill otomatik secilmemisse `$regression-guard` acik cagrisini kullan; skill incelemesini testlerin yerine gecmis sayma.
- Degisiklikten once etkilenen eski akislarin sozlesmelerini belirle; degisiklikten sonra ilgili basarili ve negatif senaryolari, `npm.cmd test` ve son diff incelemesini tamamla. `git diff --check` komutunu yalnizca commit/release oncesinde veya whitespace, merge ve format riski bulunan degisikliklerde calistir.
