# Hali Saha Rezervasyon Sistemi - Mimari Dokuman

Bu dokuman projenin guncel teknik yapisini tarif eder. Kod icin ana kaynaklar `server/index.js`, `server/routes/`, `server/db.js`, `server/initDb.js`, `public/`, `database_complete.sql`, `package.json` ve `railway.json` dosyalaridir.

## 1. Sistem Ozeti

Hali Saha Rezervasyon Sistemi, musterilerin hali saha rezervasyonu yapabildigi; isletmelerin saha, rezervasyon, borc, abonelik, yorum, kara liste ve Telegram bildirim ayarlarini yonettigi; yoneticinin saha ve kullanici yonetimi yapabildigi Express + MySQL tabanli web uygulamasidir.

- **Canli ortam:** Railway
- **Backend:** Node.js 18+ ve Express 4
- **Frontend:** `public/` altindan sunulan statik HTML, CSS ve JavaScript
- **Veritabani:** MySQL, `mysql2` connection pool
- **Kimlik dogrulama:** JWT tabanli kullanici, isletme ve admin tokenlari
- **Guvenlik katmani:** `helmet`, CORS, rate limit, HTTPS redirect, Cloudflare Turnstile
- **Bildirim:** Telegram outbox worker
- **Odeme modeli:** Tek odeme, ortak odeme ve isletme tarafindan elden/nakit odeme isaretleme

## 2. Calisma Mimarisi

```text
Browser
  |
  | HTML/CSS/JS: public/
  v
Express uygulamasi: server/index.js
  |
  | Middleware: global rate limit, CORS, JSON parser, helmet, compression
  |
  | Statik dosyalar: public/
  |
  | REST API routerlari: server/routes/
  v
MySQL pool: server/db.js
  |
  | Sema ve idempotent migration: database_complete.sql + server/initDb.js
  v
Railway MySQL veya local MySQL
```

`server/index.js` uygulamanin giris noktasidir. Railway de ayni dosyayi `node server/index.js` komutu ile baslatir.

Uygulama baslarken:

1. `.env` yuklenir.
2. `JWT_SECRET` yoksa uygulama baslamaz.
3. Express middleware zinciri kurulur.
4. `public/` statik olarak sunulur.
5. API routerlari `server/routes/` altindan kaydedilir.
6. `runMinify()` calisir.
7. MySQL baglantisi alinir ve `initDatabase()` ile tablo/migration kontrolleri yapilir.
8. Telegram outbox worker baslar.
9. Haftalik abonelik isleme gorevi bir kez calisir ve saatlik interval ile devam eder.

## 3. Backend

### 3.1 Ana Sunucu

Ana dosya: `server/index.js`

Temel sorumluluklar:

- `dotenv` ile ortam degiskenlerini yuklemek
- `JWT_SECRET` zorunlulugunu kontrol etmek
- Global rate limit uygulamak
- Production ortaminda CORS origin'ini Railway domainiyle sinirlamak
- `helmet` ile CSP ve temel guvenlik headerlarini kurmak
- Production ortaminda HTTP isteklerini HTTPS'e yonlendirmek
- `compression` ile yanitlari sikistirmak
- `public/` klasorunu statik sunmak
- API routerlarini baslatmak
- Global hata yakalama middleware'ini kurmak
- Veritabani migration ve Telegram worker baslangicini yapmak

Statik sayfa rotalari:

| Rota | Dosya | Amac |
| --- | --- | --- |
| `/` | `public/index.html` | Musteri ana ekrani |
| `/isletme` | `public/isletme.html` | Isletme paneli |
| `/yonetici` | `public/yonetici.html` | Admin paneli |
| `/payment/share/:code` | `public/payment-share.html` | Ortak odeme sayfasi |
| `/health` | metin yanit | Railway healthcheck |
| `/api/config` | JSON yanit | Frontend icin Turnstile site key |

### 3.2 Router Yapisi

API katmani tek dosyada tutulmaz. Her ana is alani `server/routes/` altindaki ayri modulden `server/index.js` icine kaydedilir.

| Dosya | Sorumluluk |
| --- | --- |
| `server/routes/auth.js` | Kullanici kaydi, kullanici girisi, profil guncelleme, isletme girisi |
| `server/routes/pitch.js` | Saha listesi, saha ayarlari, gunluk saatler, saha fotograflari, Telegram ayarlari |
| `server/routes/reservations.js` | Rezervasyon listeleme, olusturma, iptal, erteleme, bloklama, odeme durumu |
| `server/routes/business.js` | Isletme rezervasyonlari, manuel rezervasyon, borclar, istatistikler, mac/takim ilanlari |
| `server/routes/subscriptions.js` | Haftalik abonelik listeleme, olusturma ve silme |
| `server/routes/reviews.js` | Saha yorumlari, puanlama ve isletme yanitlari |
| `server/routes/playerReviews.js` | Oyuncu degerlendirmeleri |
| `server/routes/fieldComments.js` | Saha yorum akisi |
| `server/routes/forum.js` | Oyuncu bulma ilani ve ilan yorumlari |
| `server/routes/blacklist.js` | Saha bazli kara liste islemleri |
| `server/routes/admin.js` | Admin girisi, saha/kullanici/duyuru/gelir/global kara liste yonetimi |
| `server/routes/payment.js` | Tek odeme, ortak odeme, odeme gruplari ve sure dolumu |

### 3.3 Middleware ve Yardimci Moduller

| Dosya | Gorev |
| --- | --- |
| `server/middleware/rateLimiter.js` | Global, rezervasyon ve giris denemesi limitleri |
| `server/middleware/businessAuth.js` | JWT ile admin/isletme/kullanici actor dogrulama |
| `server/middleware/paymentLock.js` | MySQL transaction yardimcilari |
| `server/middleware/errorHandler.js` | JSON hata yanitlari |
| `server/utils/slotLock.js` | Ayni saha/saat icin race condition azaltan slot lock |
| `server/utils/telegram.js` | Telegram outbox kaydi, gonderim ve retry mantigi |
| `server/minify.js` | CSS/JS minify uretimi |
| `server/migrateDates.js` | Eski tarih verilerini `play_date` alanina tasima yardimcisi |

## 4. Veritabani

### 4.1 Baglanti

Baglanti havuzu `server/db.js` icinde `mysql2` ile kurulur.

Oncelik sirasi:

| Alan | Manuel env | Railway env | Local fallback |
| --- | --- | --- | --- |
| Host | `DB_HOST` | `MYSQLHOST` | `127.0.0.1` |
| User | `DB_USER` | `MYSQLUSER` | `root` |
| Password | `DB_PASSWORD` veya `DB_PASS` | `MYSQLPASSWORD` | bos |
| Database | `DB_NAME` | `MYSQLDATABASE` | `halisaha_kiralama` |
| Port | `DB_PORT` | `MYSQLPORT` | `3306` |

Pool ayarlari:

- `connectionLimit: 15`
- `maxIdle: 5`
- `enableKeepAlive: true`
- `multipleStatements: true`
- `charset: utf8mb4`
- `collation: utf8mb4_unicode_ci`

### 4.2 Sema ve Migration

Baslangic semasi `database_complete.sql` dosyasindan yuklenir. Uygulama baslarken `server/initDb.js` idempotent migration kontrollerini calistirir. Bu dosya eksik kolonlari ve yeni tablolari ekler, bazi eski verileri normalize eder ve kritik indeksleri dogrular.

Temel tablolar:

| Tablo | Icerik |
| --- | --- |
| `users` | Musteri hesaplari, profil bilgileri, telefon/email, parola hash'i |
| `reservations` | Rezervasyonlar, odeme durumu, status, saha/saat/tarih bilgisi |
| `reservation_details` | Rezervasyon detay iliskileri |
| `pitch_settings` | Isletme/saha ayarlari, sifre, Telegram chat id, gorunurluk |
| `pitch_objects` | Saha objeleri, fiyatlar, ozellikler, fotograf/gorunum bilgileri |
| `field_daily_hours` | Saha bazli gunluk calisma saatleri |
| `field_blacklists` | Saha bazli telefon kara listeleri |
| `subscriptions` | Haftalik abonelikler |
| `forum_posts` | Oyuncu bulma ilanlari |
| `forum_comments` | Forum ve mac ilani yorumlari |
| `match_seekers` | Mac arayan ilanlari |
| `team_seekers` | Takim arayan ilanlari |
| `reviews` | Saha puanlari ve isletme yanitlari |
| `player_reviews` | Oyuncu degerlendirmeleri |
| `field_comments` | Saha yorumlari |
| `daily_statistics` | Gunluk saha istatistikleri |
| `payment_groups` | Ortak odeme gruplari ve paylasim kodlari |
| `payment_shares` | Ortak odemede bireysel odeme kayitlari |
| `telegram_notification_outbox` | Telegram bildirim kuyrugu |
| `super_admins` | Admin hesaplari |
| `admin_login_logs` | Admin giris loglari |
| `admin_activity_log` | Admin aksiyon loglari |
| `announcements` | Duyurular |

Kritik migration davranislari:

- `reservations.status` alanini esnek `VARCHAR(20)` durumuna normalize eder.
- Eski `users.name` alanini `first_name` ve `last_name` alanlarina ayirir.
- Eski sosyal giris ve tek kullanimlik dogrulama kolonlari varsa kaldirir.
- Abonelik rezervasyonlarini `subscription_id` ile eslestirir.
- Ayni abonelik/gun icin `unique_subscription_occurrence` indeksini dogrular.
- Varsayilan isletme sifrelerini yalnizca hala default durumdaysa seeder.
- Varsayilan admin kullanicisini `bcryptjs` hash ile `super_admins` tablosuna ekler.

## 5. Frontend

Frontend dosyalari `public/` altindan statik olarak sunulur.

| Dosya | Rol |
| --- | --- |
| `public/index.html` | Musteri ana uygulamasi |
| `public/isletme.html` | Isletme paneli |
| `public/yonetici.html` | Admin paneli |
| `public/payment-share.html` | Ortak odeme linki ile acilan odeme sayfasi |
| `public/style.css` | Kaynak CSS |
| `public/style.min.css` | Minify edilmis CSS |
| `public/script.js` | Ana kaynak JavaScript |
| `public/script.min.js` | Minify edilmis ana JavaScript |
| `public/payment-spinner.css` | Odeme arayuzu ek stili |
| `public/js/*.js` | Sayfalarin ana scripte ek olarak yukledigi kucuk yardimci dosyalar |

`public/js/` altindaki yardimci dosyalar:

| Dosya | Alan |
| --- | --- |
| `auth-context.js` | Sayfaya gore dogru kullanici/isletme/admin token header'ini secme yardimcisi |
| `main.js` | Ana ekran baslangic akisi |

HTML parcali build sistemi yoktur. Frontend kaynaklari `public/` altinda tutulur ve statik olarak sunulur.

## 6. Ana Is Akislari

### 6.1 Rezervasyon

1. Musteri saha, tarih, saha numarasi ve saat secer.
2. Frontend dolu saatleri, abonelikleri, calisma saatlerini ve fiyat bilgisini API'den alir.
3. Cloudflare Turnstile token'i alinir.
4. `POST /api/reservations` istegi gonderilir.
5. Backend saha/saat cakismasini, kullanici limitlerini, kara listeyi ve abonelik cakismalarini kontrol eder.
6. Rezervasyon ilk olarak `pending_payment` status ile olusur.
7. Tek odeme veya ortak odeme tamamlaninca odeme durumu `odendi`, rezervasyon durumu `active` olur.
8. Uygun olaylarda Telegram outbox'a bildirim eklenir.

### 6.2 Odeme

Tek odeme:

- `POST /api/reservations/:id/payment/pay-single`
- Rezervasyon `pending_payment` olmalidir.
- Basarili olunca `payment_status = odendi` ve `status = active` olur.

Ortak odeme:

- `POST /api/reservations/:id/payment/init` ortak odeme grubu ve `share_code` olusturur.
- `/payment/share/:code` sayfasi paylasim linkinden acilir.
- `POST /api/payment/share/:code/pay` bireysel odeme kaydini ekler.
- Ikinci odeme tamamlaninca grup `completed`, rezervasyon `odendi` olur.
- Sure dolan ortak odemeler `payment.js` tarafindan `expired` durumuna cekilir.

Isletme manuel odeme:

- Isletme paneli manuel rezervasyon olusturabilir.
- Elden/nakit odeme `payment_method = cash` ve `payment_status = odendi` olarak kaydedilebilir.
- Manuel odeme guncellemelerinde yetki `requireAuthenticatedActor` ile kontrol edilir.

### 6.3 Haftalik Abonelik

`server/index.js` icindeki `processWeeklySubscriptions()` fonksiyonu gunun aboneliklerini kontrol eder.

- Uygulama acilisinda bir kez calisir.
- Sonra saatlik interval ile tekrar calisir.
- Ayni saha, pitch, tarih ve saat icin mevcut aktif rezervasyon varsa yeni kayit acmaz.
- Transaction ve slot lock kullanarak cakisma riskini azaltir.
- Basarili abonelik rezervasyonlarinda Telegram outbox'a bildirim ekler.

### 6.4 Telegram Bildirimleri

Telegram bildirimi dogrudan rezervasyon akisini bloke edecek sekilde tasarlanmamistir. Uygun olaylarda `telegram_notification_outbox` tablosuna kayit atilir. `startTelegramOutboxWorker(db)` kuyrugu isleyerek Telegram Bot API'ye gonderim yapar.

Desteklenen olaylar arasinda rezervasyon olusturma, abonelikten rezervasyon olusturma, iptal ve odeme bilgileri bulunur. `pitch_settings.telegram_chat_id` saha bazli hedef chat bilgisini tutar.

### 6.5 Admin ve Isletme Yonetimi

Admin paneli:

- Admin girisi JWT token uretir.
- Saha ekleme, silme, geri alma ve gorunurluk guncelleme yapabilir.
- Kullanici listeleme, detay gorme, banlama ve silme yapabilir.
- Global kara liste, duyuru, gelir ve aktivite loglarini yonetir.

Isletme paneli:

- Kendi `fieldKey` alanina ait rezervasyon, borc, istatistik, saat, fiyat, abonelik, yorum, kara liste ve Telegram ayarlarini yonetir.
- Isletme tokeni baska bir sahanin ayarlarina erisemez; `requireMatchingField` bunu kontrol eder.

## 7. Guvenlik

### 7.1 Token ve Yetki

Kimlik dogrulama JWT tabanlidir.

- Musteri girisi kullanici id/email iceren token uretir.
- Isletme girisi `role: business` ve `fieldKey` iceren token uretir.
- Admin girisi `role: admin` iceren token uretir.
- Admin tokenlari bazi isteklerde `x-admin-token`, diger actor tokenlari `Authorization: Bearer <token>` ile tasinir.

`JWT_SECRET` production ve local calismada tanimli olmalidir. Bu deger dokumana, koda veya git gecmisine yazilmamalidir.

### 7.2 Parola Guvenligi

Yeni parolalar `bcryptjs` ile hashlenir. Eski plain text kullanici parolalari basarili giriste bcrypt hash'e migrate edilir. Admin seed parolasi da hashlenmis olarak kaydedilir.

### 7.3 Rate Limit ve Bot Koruma

`server/middleware/rateLimiter.js` icinde:

- Global 15 dakikalik istek limiti
- Rezervasyon icin dakika ve saniye bazli limit
- Kullanici/isletme girisi icin saniyelik ve 15 dakikalik limit
- Telegram test endpoint'i icin ayrica rate limit

Cloudflare Turnstile rezervasyon olusturma akisini korumak icin kullanilir. Site key frontend'e `/api/config` ile verilir; secret key ortam degiskeninde tutulmalidir.

### 7.4 HTTP Guvenligi

`helmet` ile CSP ve temel guvenlik headerlari uygulanir. Production ortaminda HTTP istekleri HTTPS'e yonlendirilir. `X-Content-Type-Options`, `X-Frame-Options` ve `Strict-Transport-Security` headerlari ayrica set edilir.

## 8. API Ozeti

Bu bolum ayrintili request/response sozlesmesi degil, gelistiriciye rota haritasi vermek icindir.

| Alan | Endpointler |
| --- | --- |
| Config | `GET /api/config` |
| Auth | `POST /api/register`, `POST /api/login`, `PUT /api/users/profile`, `POST /api/business-login` |
| Sahalar | `GET /api/fields`, `GET /api/pitch-list`, `GET /api/all-fields`, `GET/PUT /api/pitch-settings...`, `GET/PUT /api/field-daily-hours...`, `GET/POST/DELETE /api/field-photos...` |
| Rezervasyon | `GET/POST /api/reservations`, `GET /api/reservations/:id`, `PUT/DELETE /api/reservations/:id`, `POST /api/reserve-specific-hours`, `GET /api/user-reservations` |
| Odeme | `POST /api/reservations/:id/payment/init`, `POST /api/reservations/:id/payment/pay-single`, `PUT /api/reservations/:id/payment`, `GET/POST /api/payment/share/:code` |
| Isletme | `GET /api/business-reservations/:fieldKey`, `POST /api/business-reservations/:fieldKey/manual`, `GET /api/business-debts/:fieldKey`, `GET /api/business-stats`, `GET /api/stats-content/:fieldKey` |
| Abonelik | `GET /api/subscriptions`, `GET /api/subscriptions/:fieldKey`, `GET /api/subscriptions/by-user/:userId`, `POST /api/subscriptions`, `DELETE /api/subscriptions/:id` |
| Forum/Mac/Takim | `GET/POST /api/forum`, `PUT/DELETE /api/forum/:id`, `GET/POST /api/match-seekers`, `GET/POST /api/team-seekers` |
| Yorumlar | `GET/POST /api/field-comments`, `GET/POST /api/forum-comments`, `GET/POST /api/reviews`, `POST /api/reviews/:id/reply`, `GET/POST /api/player-reviews` |
| Kara Liste | `GET/POST/DELETE /api/blacklist...`, `GET /api/blacklists/by-phone/:phone` |
| Admin | `POST /api/admin/login`, `GET /api/admin/dashboard`, saha/kullanici/duyuru/gelir/global kara liste/activity log endpointleri |

## 9. Deployment ve Calistirma

### 9.1 Gereksinimler

- Node.js 18+
- MySQL
- `npm install` ile yuklenen Node paketleri
- Local calismada `.env`; Railway'de environment variables

Local MySQL resmi MySQL Server, MySQL Installer, Docker veya baska bir MySQL kurulumu olabilir. Uygulama sadece MySQL host, port, kullanici, parola ve database bilgilerine ihtiyac duyar.

### 9.2 Local Calistirma

```bash
npm install
npm start
```

`npm start`, `node server/index.js` komutunu calistirir. Sunucu varsayilan olarak `http://127.0.0.1:5000` uzerinden dinler; uygulama `0.0.0.0` host'una bind eder.

Gerekli local ortam degiskenleri:

```text
JWT_SECRET=...
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=...
DB_NAME=halisaha_kiralama
DB_PORT=3306
TURNSTILE_SITEKEY=...
TURNSTILE_SECRET=...
TELEGRAM_BOT_TOKEN=...
```

Gizli degerler `.env` veya Railway environment variables disinda tutulmamalidir.

### 9.3 Railway

`railway.json` guncel deploy ayarlari:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Railway MySQL degiskenleri `server/db.js` tarafindan desteklenir: `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`.

## 10. Build ve Minify

`package.json` scriptleri:

```json
{
  "start": "node server/index.js",
  "test": "node --test",
  "minify": "node server/minify.js"
}
```

Minify islemi iki sekilde calisabilir:

- Manuel: `npm run minify`
- Sunucu baslangicinda: `server/index.js` icinde `runMinify()`

Uretim HTML dosyalari `style.min.css` ve `script.min.js` dosyalarini yukler. Kaynak dosyalar `public/style.css` ve `public/script.js` olarak kalir.

## 11. Gelistirme Notlari

- Uygulama koduna davranis degisikligi yapmadan once ilgili router ve frontend akisi birlikte incelenmelidir.
- Rezervasyon, abonelik, odeme ve manuel rezervasyon degisikliklerinde cakisma, transaction ve status gecisleri kontrol edilmelidir.
- Payment akislari `pending_payment`, `active`, `expired`, `odendi`, `odenmedi` durumlariyla birlikte dusunulmelidir.
- Telegram bildirimi eklenen akislarda outbox davranisi korunmalidir.
- Admin ve isletme yetki kontrollerinde `requireBusinessOrAdmin`, `requireAuthenticatedActor` ve `requireMatchingField` etkisi kontrol edilmelidir.
- Veritabani yedekleri kod deposunun parcasi degildir; backup dosyalari git'e eklenmemelidir.
- Canli ortama cikmadan once `/health`, temel musteri rezervasyon akisi, isletme paneli ve ilgili hata loglari kontrol edilmelidir.
