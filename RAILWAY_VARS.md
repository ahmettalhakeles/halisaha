# Railway Variables

Prod ortamında doldurulacak alanlar:

```text
GOOGLE_CLIENT_ID=Google Cloud Console'dan aldigin client id
GOOGLE_AUTH_ENABLED=false
EMAIL_VERIFICATION_REQUIRED=false
BREVO_API_KEY=Brevo API key
MAIL_FROM_EMAIL=ksk.yardim@gmail.com
MAIL_FROM_NAME=KSK Kolay Saha Kiralama
APP_BASE_URL=https://halisaha-production.up.railway.app
```

Mevcut ve dokunmaman gerekenler:

```text
DB_HOST
DB_NAME
DB_USER
DB_PASS
JWT_SECRET
PORT
NODE_ENV
TELEGRAM_BOT_TOKEN
TURNSTILE_SITEKEY
TURNSTILE_SECRET_KEY
```

Not:

- `GOOGLE_CALLBACK_URL` bu projede kullanılmıyor.
- `GOOGLE_CLIENT_SECRET` gerekmiyor.
- Test bittikten sonra `GOOGLE_AUTH_ENABLED=true` ve `EMAIL_VERIFICATION_REQUIRED=true` açılabilir.
