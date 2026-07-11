require('dotenv').config();
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

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https://www.gstatic.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.gstatic.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://challenges.cloudflare.com", "https://translate.googleapis.com", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            frameSrc: ["'self'", "https://challenges.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://www.google.com", "https://www.gstatic.com"],
            connectSrc: ["'self'", "https://api.open-meteo.com"],
            formAction: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

const compression = require('compression');
app.use(compression());

app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: 86400000, // 1 day in milliseconds
    etag: true
}));

app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        turnstileSiteKey: process.env.TURNSTILE_SITEKEY || '1x00000000000000000000AA'
    });
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

// DB baglantisini baslat + migration
(async () => {
    try {
        // Run minifier
        const { runMinify } = require('./minify');
        await runMinify();

        const conn = await db.promise().getConnection();
        console.log('MySQL veritabanina basariyla baglanildi!');

        const { initDatabase } = require('./initDb');
        await initDatabase(conn);

        conn.release();
    } catch (err) {
        console.error('MySQL baglanti hatasi:', err.message);
    }
})();

// Global error handler
app.use((err, req, res, next) => {
    console.error('Sunucu Hatasi:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatasi olustu!' });
});

// Cron job: weekly subscriptions
const dayNames = ["PAZAR","PAZARTESI","SALI","CARSAMBA","PERSEMBE","CUMA","CUMARTESI"];
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
            const [existing] = await db.promise().query('SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND (play_date = ? OR dateText = ?) AND hourText = ? AND type = ?', [sub.fieldKey, sub.pitchNumber, play_date, dateText, sub.hourText, 'abone']);
            if (existing.length > 0) continue;
            await db.promise().query('INSERT INTO reservations (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, 0, "odenmedi", "active", "abone")', [sub.fieldKey, sub.pitchNumber, dateText, play_date, sub.hourText, sub.subscriberName, sub.user_id]);
        }
    } catch (err) {
        console.error('Cron: Abonelik hatasi:', err);
    }
}
processWeeklySubscriptions().catch(err => console.error('Cron baslatma hatasi:', err));
setInterval(processWeeklySubscriptions, 60 * 60 * 1000);

app.listen(port, '0.0.0.0', () => {
    console.log(`Sunucu http://0.0.0.0:${port} adresinde calisiyor!`);
});
