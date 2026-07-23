require('dotenv').config();
const { hasRequiredTurnstileConfig } = require('./utils/turnstile');
const { getGoogleClientId, isGoogleAuthEnabled, validateOptionalIntegrations } = require('./utils/authConfig');
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
    process.exit(1);
}
if (!hasRequiredTurnstileConfig()) {
    console.error('FATAL ERROR: TURNSTILE_SITEKEY and a Turnstile secret must be defined in production.');
    process.exit(1);
}
try {
    validateOptionalIntegrations();
} catch (error) {
    console.error('FATAL ERROR:', error.message);
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const db = require('./db');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();
const port = process.env.PORT || 5000;

app.use(globalLimiter);

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://halisaha-production.up.railway.app' : '*'
}));

app.use(express.json());

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https://www.gstatic.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.gstatic.com", "https://accounts.google.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://challenges.cloudflare.com", "https://translate.googleapis.com", "https://accounts.google.com", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            frameSrc: ["'self'", "https://challenges.cloudflare.com", "https://accounts.google.com"],
            imgSrc: ["'self'", "data:", "https://www.google.com", "https://www.gstatic.com", "https://accounts.google.com"],
            connectSrc: ["'self'", "https://challenges.cloudflare.com", "https://accounts.google.com", "https://www.googleapis.com"],
            formAction: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    next();
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.use((req, res, next) => {
    if ((req.path === '/health' || req.path === '/healthz') && process.env.NODE_ENV === 'production') {
        return next();
    }
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

const compression = require('compression');
app.use(compression());

app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0,
    etag: true
}));

app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        turnstileSiteKey: process.env.TURNSTILE_SITEKEY || (process.env.NODE_ENV === 'production' ? '' : '1x00000000000000000000AA'),
        googleClientId: isGoogleAuthEnabled() ? getGoogleClientId() : '',
        googleAuthEnabled: isGoogleAuthEnabled() && Boolean(getGoogleClientId())
    });
});

let weatherCache = { data: null, fetchedAt: 0 };
const WEATHER_CACHE_MS = 30 * 60 * 1000;

app.get('/api/weather', async (req, res) => {
    const now = Date.now();
    if (weatherCache.data && now - weatherCache.fetchedAt < WEATHER_CACHE_MS) {
        return res.json({ success: true, data: weatherCache.data, cached: true });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.6558&longitude=35.8272&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto', {
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
        const data = await response.json();
        weatherCache = { data, fetchedAt: now };
        res.json({ success: true, data, cached: false });
    } catch (error) {
        if (weatherCache.data) {
            return res.json({ success: true, data: weatherCache.data, cached: true, stale: true });
        }
        res.status(502).json({ success: false, message: 'Hava durumu yüklenemedi.' });
    } finally {
        clearTimeout(timeout);
    }
});

app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.svg'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/isletme', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'isletme.html'));
});

app.get('/yonetici', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'yonetici.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'terms.html'));
});

app.use(errorHandler);

const { initAuthRoutes } = require('./routes/auth');
const { initPitchRoutes } = require('./routes/pitch');
const { initReservationRoutes } = require('./routes/reservations');
const { initForumRoutes } = require('./routes/forum');
const { initSubscriptionRoutes } = require('./routes/subscriptions');
const { initBusinessRoutes } = require('./routes/business');
const { initReviewRoutes } = require('./routes/reviews');
const { initPlayerReviewRoutes } = require('./routes/playerReviews');
const { initFieldCommentRoutes } = require('./routes/fieldComments');
const { initBlacklistRoutes } = require('./routes/blacklist');
const { initAdminRoutes } = require('./routes/admin');
const { initPaymentRoutes } = require('./routes/payment');

initAuthRoutes(app, db);
initPitchRoutes(app, db);
initReservationRoutes(app, db);
initForumRoutes(app, db);
initSubscriptionRoutes(app, db);
initBusinessRoutes(app, db);
initReviewRoutes(app, db);
initPlayerReviewRoutes(app, db);
initFieldCommentRoutes(app, db);
initBlacklistRoutes(app, db);
initAdminRoutes(app, db);
initPaymentRoutes(app, db);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Sunucu Hatasi:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatasi olustu!' });
});

// Cron job: weekly subscriptions
const dayNames = ["PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"];
const { enqueueTelegramNotification, startTelegramOutboxWorker } = require('./utils/telegram');
const { acquireSlotLock } = require('./utils/slotLock');
async function processWeeklySubscriptions() {
    const now = new Date();
    const todayName = dayNames[now.getDay()];
    try {
        const [subs] = await db.promise().query('SELECT * FROM subscriptions WHERE dayOfWeek = ?', [todayName]);
        if (subs.length === 0) return;
        const dateText = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const play_date = `${yyyy}-${mm}-${dd}`;
        for (const sub of subs) {
            const connection = await db.promise().getConnection();
            let releaseSlot = async () => {};
            try {
                await connection.beginTransaction();
                const slot = { fieldKey: sub.fieldKey, pitchNumber: sub.pitchNumber, play_date, dateText, hourText: sub.hourText };
                releaseSlot = await acquireSlotLock(connection, slot);
                const [existing] = await connection.query(
                    `SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ?
                     AND (play_date = ? OR dateText = ?) AND hourText = ? AND status != 'cancelled' FOR UPDATE`,
                    [sub.fieldKey, sub.pitchNumber, play_date, dateText, sub.hourText]
                );
                if (existing.length > 0) {
                    await connection.rollback();
                    continue;
                }
                const [insertResult] = await connection.query(
                    `INSERT INTO reservations
                     (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id,
                      reservation_price, payment_status, status, type, subscription_id, payment_method)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'odenmedi', 'active', 'abone', ?, 'cash')`,
                    [sub.fieldKey, sub.pitchNumber, dateText, play_date, sub.hourText, sub.subscriberName, sub.user_id, sub.id]
                );
                await enqueueTelegramNotification(connection, insertResult.insertId, 'subscription_created');
                await connection.commit();
            } catch (error) {
                await connection.rollback().catch(() => {});
                throw error;
            } finally {
                await releaseSlot();
                connection.release();
            }
        }
    } catch (err) {
        console.error('Cron: Abonelik hatasi:', err);
    }
}

async function start() {
    const { runMinify } = require('./minify');
    const { initDatabase } = require('./initDb');
    await runMinify();
    const connection = await db.promise().getConnection();
    try {
        console.log('MySQL veritabanina basariyla baglanildi!');
        await initDatabase(connection);
    } finally {
        connection.release();
    }
    app.listen(port, '0.0.0.0', () => {
        console.log(`Sunucu http://0.0.0.0:${port} adresinde calisiyor!`);
        startTelegramOutboxWorker(db);
        processWeeklySubscriptions().catch(err => console.error('Cron hatasi:', err));
        setInterval(() => processWeeklySubscriptions().catch(err => console.error('Cron hatasi:', err)), 60 * 60 * 1000);
    });
}

start().catch(err => {
    console.error('Uygulama baslatilamadi:', err.message);
    process.exit(1);
});
