require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
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

// DB bağlantısını başlat + migration
const connection = db.promise();
(async () => {
    try {
        const conn = await db.promise().getConnection();
        console.log('MySQL veritabanına başarıyla bağlanıldı!');

        const { initDatabase } = require('./initDb');
        await initDatabase(conn);

        conn.release();
    } catch (err) {
        console.error('MySQL bağlantı hatası:', err.message);
    }
})();

// Global error handler
app.use((err, req, res, next) => {
    console.error('Sunucu Hatası:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası oluştu!' });
});

// Cron job: weekly subscriptions
const dayNames = ["PAZAR","PAZARTESİ","SALI","ÇARŞAMBA","PERŞEMBE","CUMA","CUMARTESİ"];
async function processWeeklySubscriptions() {
    const now = new Date();
    const todayName = dayNames[now.getDay()];
    try {
        const [subs] = await db.promise().query('SELECT * FROM subscriptions WHERE dayOfWeek = ?', [todayName]);
        if (subs.length === 0) return;
        const dateText = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');
        for (const sub of subs) {
            const [existing] = await db.promise().query('SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND type = ?', [sub.fieldKey, sub.pitchNumber, dateText, sub.hourText, 'abone']);
            if (existing.length > 0) continue;
            await db.promise().query('INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_id, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, 0, "odenmedi", "active", "abone")', [sub.fieldKey, sub.pitchNumber, dateText, sub.hourText, sub.subscriberName, sub.user_id]);
        }
    } catch (err) {
        console.error('Cron: Abonelik hatası:', err);
    }
}
processWeeklySubscriptions();
setInterval(processWeeklySubscriptions, 60 * 60 * 1000);

app.listen(port, () => {
    console.log(`Sunucu http://127.0.0.1:${port} adresinde çalışıyor!`);
});
