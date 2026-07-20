const TELEGRAM_TIMEOUT_MS = 8000;
const WORKER_INTERVAL_MS = 15000;
const MAX_ATTEMPTS = 8;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMoney(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? `${amount.toLocaleString('tr-TR')} TL` : '0 TL';
}

function formatTelegramDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const ymd = raw.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        const [year, month, day] = ymd.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).toLocaleUpperCase('tr-TR');
    }
    return raw;
}

function buildMessage(eventType, payload = {}) {
    if (eventType === 'test') {
        return '<b>✅ Telegram bağlantısı başarılı</b>\n\nHalı saha bildirimleri bu sohbete gönderilecektir.';
    }

    const isManual = payload.payment_type === 'manual_cash' || payload.payment_type === 'manual' || payload.payment_method === 'cash' || payload.type === 'manual';
    const title = {
        paid: payload.payment_type === 'shared' ? '✅ Ortak ödeme tamamlandı' : (isManual ? '📝 Manuel rezervasyon yapıldı' : '✅ Online rezervasyon yapıldı'),
        subscription_created: '📅 Abonelik rezervasyonu oluşturuldu',
        cancelled: '❌ Rezervasyon iptal edildi',
        pending_share: '⏳ Ortak ödeme başladı (İlk ödeme alındı, 2. kişi bekleniyor)',
        manual_created: '📝 Manuel rezervasyon yapıldı'
    }[eventType];
    if (!title) throw new Error(`Desteklenmeyen Telegram olay türü: ${eventType}`);

    const lines = [
        `<b>${title}</b>`, '',
        `<b>İşletme:</b> ${escapeHtml(payload.field_name || payload.field_key || '-')}`,
        `<b>Saha:</b> ${escapeHtml(payload.pitch_number || '-')}`,
        `<b>Tarih:</b> ${escapeHtml(formatTelegramDate(payload.date_text || payload.play_date))}`,
        `<b>Saat:</b> ${escapeHtml(payload.hour_text || '-')}`,
        `<b>Müşteri:</b> ${escapeHtml(payload.user_name || '-')}`
    ];
    if (payload.user_phone) lines.push(`<b>Telefon:</b> ${escapeHtml(payload.user_phone)}`);
    if (eventType === 'paid' || eventType === 'pending_share' || eventType === 'manual_created') lines.push(`<b>Tutar:</b> ${escapeHtml(formatMoney(payload.reservation_price))}`);
    if (payload.payment_type === 'shared') lines.push('<b>Ödeme:</b> İki tarafın ödemesi tamamlandı');
    if (eventType === 'pending_share') lines.push('<b>Ödeme:</b> İlk ödeme alındı, ikinci kişinin ödemesi bekleniyor.');
    if (eventType === 'manual_created') {
        const paymentStatus = payload.payment_status === 'odendi' ? 'ÖDENDİ' : 'ÖDENMEDİ';
        lines.push(`<b>Ödeme Durumu:</b> ${paymentStatus} (Elden Nakit)`);
    }
    if (eventType === 'paid' && payload.payment_type === 'manual_cash') lines.push('<b>Ödeme Durumu:</b> ÖDENDİ (Elden Nakit)');
    if (eventType === 'paid' && payload.payment_type === 'single') lines.push('<b>Ödeme Durumu:</b> ÖDENDİ (Online)');
    if (eventType === 'cancelled' && payload.cancellation_reason) {
        lines.push(`<b>Neden:</b> ${escapeHtml(payload.cancellation_reason)}`);
    }
    return lines.join('\n');
}

async function callTelegram(chatId, eventType, payload, fetchImpl = global.fetch) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        const error = new Error('TELEGRAM_BOT_TOKEN tanımlı değil');
        error.retryable = true;
        throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
    try {
        const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: buildMessage(eventType, payload), parse_mode: 'HTML' }),
            signal: controller.signal
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.ok !== true) {
            const error = new Error(body.description || `Telegram HTTP ${response.status}`);
            error.status = response.status || body.error_code;
            error.retryAfter = body.parameters?.retry_after;
            error.retryable = error.status === 401 || error.status === 429 || error.status >= 500;
            throw error;
        }
        return body.result;
    } catch (error) {
        if (error.name === 'AbortError') {
            error.message = 'Telegram isteği zaman aşımına uğradı';
            error.retryable = true;
        } else if (error.status === undefined) {
            error.retryable = true;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function getNotificationSnapshot(connection, reservationId) {
    const [rows] = await connection.query(
        `SELECT r.id, r.fieldKey AS field_key, r.pitchNumber AS pitch_number,
                r.dateText AS date_text, r.play_date, r.hourText AS hour_text,
                r.user_name, r.reservation_price, COALESCE(r.customer_phone, u.phone) AS user_phone,
                COALESCE(po.name, r.fieldKey) AS field_name, ps.telegram_chat_id
         FROM reservations r
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN pitch_objects po ON po.fieldKey = r.fieldKey AND po.pitchNumber = 1
         LEFT JOIN pitch_settings ps ON ps.fieldKey = r.fieldKey
         WHERE r.id = ?`,
        [reservationId]
    );
    return rows[0] || null;
}

async function enqueueTelegramNotification(connection, reservationId, eventType, extraPayload = {}) {
    const snapshot = await getNotificationSnapshot(connection, reservationId);
    if (!snapshot || !snapshot.telegram_chat_id) return false;
    const payload = { ...snapshot, ...extraPayload };
    delete payload.telegram_chat_id;
    const [result] = await connection.query(
        `INSERT IGNORE INTO telegram_notification_outbox
            (reservation_id, field_key, chat_id_snapshot, event_type, payload)
         VALUES (?, ?, ?, ?, ?)`,
        [reservationId, snapshot.field_key, snapshot.telegram_chat_id, eventType, JSON.stringify(payload)]
    );
    return result.affectedRows === 1;
}

function retryDelaySeconds(attempts, retryAfter) {
    if (retryAfter) return Math.max(1, Number(retryAfter));
    return [60, 300, 900, 3600, 21600, 43200, 86400, 86400][Math.min(Math.max(attempts - 1, 0), 7)];
}

async function processOne(db) {
    const connection = await db.promise().getConnection();
    let event;
    try {
        await connection.beginTransaction();
        await connection.query(
            `UPDATE telegram_notification_outbox SET status = 'pending', locked_at = NULL
             WHERE status = 'processing' AND locked_at < NOW() - INTERVAL 5 MINUTE`
        );
        const [rows] = await connection.query(
            `SELECT * FROM telegram_notification_outbox
             WHERE status = 'pending' AND next_attempt_at <= NOW()
             ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`
        );
        if (rows.length === 0) {
            await connection.commit();
            return false;
        }
        event = rows[0];
        await connection.query(
            `UPDATE telegram_notification_outbox
             SET status = 'processing', locked_at = NOW(), attempts = attempts + 1 WHERE id = ?`,
            [event.id]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
    } finally {
        connection.release();
    }

    try {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        await callTelegram(event.chat_id_snapshot, event.event_type, payload);
        await db.promise().query(
            `UPDATE telegram_notification_outbox SET status = 'sent', sent_at = NOW(),
             locked_at = NULL, last_error = NULL WHERE id = ?`, [event.id]
        );
    } catch (error) {
        const attempts = Number(event.attempts || 0) + 1;
        const shouldRetry = error.retryable && attempts < MAX_ATTEMPTS;
        const delay = retryDelaySeconds(attempts, error.retryAfter);
        await db.promise().query(
            `UPDATE telegram_notification_outbox SET status = ?,
             next_attempt_at = DATE_ADD(NOW(), INTERVAL ? SECOND), locked_at = NULL,
             last_error = ? WHERE id = ?`,
            [shouldRetry ? 'pending' : 'dead', delay, String(error.message || 'Telegram hatası').slice(0, 500), event.id]
        );
        if (error.status === 403) {
            await db.promise().query(
                `UPDATE pitch_settings SET telegram_chat_id = NULL
                 WHERE fieldKey = ? AND telegram_chat_id = ?`,
                [event.field_key, event.chat_id_snapshot]
            );
        }
        console.error(`[TELEGRAM] Olay ${event.id} gönderilemedi: ${String(error.message).slice(0, 200)}`);
    }
    return true;
}

function startTelegramOutboxWorker(db) {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try {
            while (await processOne(db)) { /* due olayları boşalt */ }
        } catch (error) {
            console.error('[TELEGRAM] Outbox worker hatası:', error.message);
        } finally {
            running = false;
        }
    };
    tick();
    const timer = setInterval(tick, WORKER_INTERVAL_MS);
    return () => clearInterval(timer);
}

module.exports = { escapeHtml, buildMessage, callTelegram, enqueueTelegramNotification, startTelegramOutboxWorker };
