const { enqueueTelegramNotification } = require('../utils/telegram');
const { requireBusinessOrAdmin, requireAuthenticatedActor } = require('../middleware/businessAuth');
const { acquireSlotLock } = require('../utils/slotLock');

function getNextOccurrence(dayOfWeek) {
    const dayNames = ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ'];
    const todayIndex = new Date().getDay();
    const targetIndex = dayNames.indexOf(dayOfWeek);
    let daysUntil = targetIndex - todayIndex;
    if (daysUntil <= 0) daysUntil += 7;
    const date = new Date();
    date.setDate(date.getDate() + daysUntil);
    const dateText = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');
    const playDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { dateText, playDate };
}

function initSubscriptionRoutes(app, db) {
    app.get('/api/subscriptions', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });
        db.query(
            `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) AS subscriberName, u.phone AS user_phone
             FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id
             WHERE s.fieldKey = ? ORDER BY s.subscriberName`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    app.get('/api/subscriptions/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        db.query(
            `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) AS subscriberName, u.phone AS user_phone
             FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id
             WHERE s.fieldKey = ? ORDER BY s.pitchNumber ASC,
             FIELD(s.dayOfWeek, 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'), s.hourText ASC`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json({ success: true, data: results });
            }
        );
    });

    app.get('/api/subscriptions/by-user/:userId', (req, res) => {
        db.query(
            `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) AS subscriberName, u.phone AS user_phone
             FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id
             WHERE s.user_id = ? ORDER BY FIELD(s.dayOfWeek, 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'), s.hourText ASC`,
            [req.params.userId],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json({ success: true, data: results });
            }
        );
    });

    app.post('/api/subscriptions', requireBusinessOrAdmin, async (req, res) => {
        const { fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, user_id, subscriberPhone } = req.body;
        if (!fieldKey || !pitchNumber || !hourText || !subscriberName) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }
        if (req.telegramActor.role === 'business' && req.telegramActor.fieldKey !== fieldKey) {
            return res.status(403).json({ success: false, message: 'Başka bir işletme için abonelik oluşturamazsınız!' });
        }
        const subDay = dayOfWeek || 'PAZARTESİ';
        const { dateText, playDate } = getNextOccurrence(subDay);
        const connection = await db.promise().getConnection();
        let releaseSlot = async () => {};
        try {
            await connection.beginTransaction();
            const [subscriptionResult] = await connection.query(
                `INSERT INTO subscriptions
                 (fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, user_id, subscriberPhone)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [fieldKey, pitchNumber, subDay, hourText, subscriberName, user_id || null, subscriberPhone || null]
            );
            const slot = { fieldKey, pitchNumber, play_date: playDate, dateText, hourText };
            releaseSlot = await acquireSlotLock(connection, slot);
            const [conflicts] = await connection.query(
                `SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ?
                 AND (play_date = ? OR dateText = ?) AND hourText = ? AND status != 'cancelled'`,
                [fieldKey, pitchNumber, playDate, dateText, hourText]
            );
            if (conflicts.length > 0) {
                const conflict = new Error('Bu tarih ve saatte başka bir rezervasyon bulunuyor.');
                conflict.code = 'SLOT_CONFLICT';
                throw conflict;
            }
            const [insertResult] = await connection.query(
                `INSERT INTO reservations
                  (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id,
                   reservation_price, payment_status, status, type, subscription_id, payment_method)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'odenmedi', 'active', 'abone', ?, 'cash')`,
                [fieldKey, pitchNumber, dateText, playDate, hourText, subscriberName, user_id || null, subscriptionResult.insertId]
            );
            await enqueueTelegramNotification(connection, insertResult.insertId, 'subscription_created');
            await connection.commit();
            res.json({ success: true, message: 'Abonelik başarıyla oluşturuldu!' });
        } catch (error) {
            await connection.rollback().catch(() => {});
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'Bu abonelik zaten mevcut!' });
            }
            if (error.code === 'SLOT_CONFLICT' || error.code === 'SLOT_LOCK_TIMEOUT') {
                return res.status(409).json({ success: false, message: error.message });
            }
            console.error('Subscription create error:', error);
            res.status(500).json({ success: false, message: 'Abonelik oluşturulamadı!' });
        } finally {
            await releaseSlot();
            connection.release();
        }
    });

    app.delete('/api/subscriptions/:id', requireAuthenticatedActor, async (req, res) => {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.query('SELECT * FROM subscriptions WHERE id = ? FOR UPDATE', [req.params.id]);
            if (rows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Abonelik bulunamadı!' });
            }
            const subscription = rows[0];
            const actor = req.reservationActor;
            const allowed = actor.role === 'admin'
                || (actor.role === 'business' && actor.fieldKey === subscription.fieldKey)
                || (actor.role === 'user' && actor.userId === Number(subscription.user_id));
            if (!allowed) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Bu aboneliği silemezsiniz!' });
            }
            await connection.query('DELETE FROM subscriptions WHERE id = ?', [subscription.id]);
            const [reservations] = await connection.query(
                `SELECT id FROM reservations WHERE subscription_id = ?
                 AND status != 'cancelled' AND (play_date IS NULL OR play_date >= CURDATE()) FOR UPDATE`,
                [subscription.id]
            );
            for (const reservation of reservations) {
                await connection.query(
                    `UPDATE reservations SET status = 'cancelled', cancelled_at = NOW(),
                     cancelled_by = ?, cancellation_reason = 'Abonelik kaldırıldı' WHERE id = ?`,
                    [actor.role, reservation.id]
                );
                await enqueueTelegramNotification(connection, reservation.id, 'cancelled', {
                    cancellation_reason: 'Abonelik kaldırıldı'
                });
            }
            await connection.commit();
            res.json({ success: true, message: 'Abonelik başarıyla silindi!' });
        } catch (error) {
            await connection.rollback().catch(() => {});
            console.error('Subscription delete error:', error);
            res.status(500).json({ success: false, message: 'Abonelik silinemedi!' });
        } finally {
            connection.release();
        }
    });
}

module.exports = { initSubscriptionRoutes };
