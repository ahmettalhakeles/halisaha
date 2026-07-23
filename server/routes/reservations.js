const { checkAndCancelExpiredPayments } = require('./payment');
const { acquireSlotLock } = require('../utils/slotLock');
const { verifyTurnstileToken } = require('../utils/turnstile');

function initReservationRoutes(app, db, options = {}) {
    const { resLimitPerMin, resLimitPerSec } = require('../middleware/rateLimiter');
    const { requireAuthenticatedActor } = require('../middleware/businessAuth');
    const { enqueueTelegramNotification } = require('../utils/telegram');
    const verifyTurnstile = options.verifyTurnstile || verifyTurnstileToken;

    // Get all reservations
    app.get('/api/reservations', async (req, res) => {
        await checkAndCancelExpiredPayments(db);
        const sqlQuery = `
            SELECT r.*
            FROM reservations r
            WHERE r.status != 'pending_payment'
            ORDER BY r.created_at DESC
        `;
        db.query(sqlQuery, (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Create reservation
    app.post('/api/reservations', resLimitPerMin, resLimitPerSec, requireAuthenticatedActor, async (req, res) => {
        const { fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status, turnstileToken } = req.body;
        const normalizedUserId = Number(user_id);
        if (!fieldKey || !pitchNumber || (!dateText && !play_date) || !hourText || !user_name || !Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        if (req.reservationActor?.role !== 'user' || req.reservationActor.userId !== normalizedUserId) {
            return res.status(403).json({ success: false, message: 'Bu kullanıcı adına rezervasyon oluşturamazsınız!' });
        }
        if (!turnstileToken) {
            return res.status(400).json({ success: false, message: 'Güvenlik doğrulaması eksik. Lütfen tekrar deneyin.' });
        }

        const playDateVal = play_date || parseTurkishDateString(dateText);
        if (!playDateVal || !isDateWithinTodayAndDays(getDateOnlyString(playDateVal), 30)) {
            return res.status(400).json({ success: false, message: 'Rezervasyon en fazla 30 gün sonrası için yapılabilir!' });
        }
        const displayDateText = getTurkishDateTextFromYMD(playDateVal);

        const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        const remoteIp = req.headers['cf-connecting-ip'] || forwardedFor || req.ip;
        let turnstileResult;
        try {
            turnstileResult = await verifyTurnstile({
                token: turnstileToken,
                remoteIp,
                expectedHostname: process.env.TURNSTILE_EXPECTED_HOSTNAME || req.hostname,
                expectedAction: 'reservation_create'
            });
        } catch (error) {
            turnstileResult = { success: false, unavailable: true };
        }
        if (!turnstileResult.success) {
            if (turnstileResult.unavailable) {
                return res.status(503).json({ success: false, message: 'Güvenlik doğrulama servisine ulaşılamıyor. Lütfen tekrar deneyin.' });
            }
            return res.status(400).json({ success: false, message: 'Güvenlik doğrulaması geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.' });
        }

        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

            const [userResult] = await connection.query('SELECT id, first_name, last_name, phone, status FROM users WHERE id = ?', [normalizedUserId]);
            if (userResult.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            }
            if (userResult[0].status === 'globally_banned') {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
            }

            const canonicalUserName = [userResult[0].first_name, userResult[0].last_name]
                .filter(Boolean)
                .join(' ')
                .trim()
                .toLocaleUpperCase('tr-TR');
            if (!canonicalUserName) {
                await connection.rollback();
                return res.status(422).json({ success: false, message: 'Kullanıcı profil adı eksik!' });
            }
            const userPhone = userResult[0].phone;
            const [blacklistResults] = await connection.query('SELECT COUNT(*) AS cnt FROM field_blacklists WHERE phone_number = ? AND fieldKey = ?', [userPhone, fieldKey]);
            if (blacklistResults[0].cnt > 0) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Bu sahada kara listeye alındınız! Rezervasyon yapamazsınız.' });
            }

            const dummyReservation = { fieldKey, pitchNumber, play_date: playDateVal, hourText };
            const releaseLock = await acquireSlotLock(connection, dummyReservation);

            try {
                const [existing] = await connection.query(
                    'SELECT id, status, type FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND play_date = ? AND hourText = ? AND status NOT IN ("cancelled", "pending_payment") FOR UPDATE',
                    [fieldKey, pitchNumber, playDateVal, hourText]
                );

                if (existing.length > 0) {
                    await connection.rollback();
                    if (existing[0].status === 'active') return res.status(409).json({ success: false, message: 'Bu saat dilimi zaten dolu!' });
                    if (existing[0].status === 'blocked') return res.status(409).json({ success: false, message: 'Bu saat dilimi işletme tarafından engellenmiş!' });
                    if (existing[0].status === 'blocked_yuksek') return res.status(409).json({ success: false, message: 'Bu saat dilimi yoğunluk nedeniyle kullanılamıyor!' });
                    if (existing[0].type === 'abone') return res.status(409).json({ success: false, message: 'Bu saat dilimi abonelik için ayrılmış!' });
                    return res.status(409).json({ success: false, message: 'Bu saat dilimi kullanılamıyor!' });
                }

                const [insertResult] = await connection.query(
                    'INSERT INTO reservations (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status, status, type, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending_payment", "normal", "online")',
                    [fieldKey, pitchNumber, displayDateText, playDateVal, hourText, canonicalUserName, normalizedUserId, reservation_price || 0, payment_status || 'odenmedi']
                );

                await connection.commit();
                res.json({ success: true, message: 'Rezervasyon başarıyla oluşturuldu!', id: insertResult.insertId });
            } finally {
                await releaseLock();
            }
        } catch (error) {
            await connection.rollback().catch(() => {});
            console.error('Reservation create error:', error);
            res.status(500).json({ success: false, message: 'Rezervasyon oluşturulamadı!' });
        } finally {
            connection.release();
        }
    });

    // Cancel reservation
    app.delete('/api/reservations/:id', requireAuthenticatedActor, async (req, res) => {
        const { id } = req.params;
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [id]);
            if (rows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
            }
            const reservation = rows[0];
            const actor = req.reservationActor;
            const allowed = actor.role === 'admin'
                || (actor.role === 'business' && actor.fieldKey === reservation.fieldKey)
                || (actor.role === 'user' && actor.userId === Number(reservation.user_id));
            if (!allowed) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Bu rezervasyonu iptal edemezsiniz!' });
            }
            if (reservation.status === 'cancelled') {
                await connection.rollback();
                return res.json({ success: true, message: 'Rezervasyon daha önce iptal edilmiş.' });
            }
            const cancelledBy = actor.role === 'user' ? `user:${actor.userId}` : actor.role;
            const reason = String(req.body?.reason || 'Rezervasyon iptal edildi').slice(0, 255);
            await connection.query(
                `UPDATE reservations SET status = 'cancelled', cancelled_at = NOW(),
                 cancelled_by = ?, cancellation_reason = ? WHERE id = ?`,
                [cancelledBy, reason, id]
            );
            await enqueueTelegramNotification(connection, id, 'cancelled', { cancellation_reason: reason });
            await connection.commit();
            res.json({ success: true, message: 'Rezervasyon başarıyla iptal edildi!' });
        } catch (error) {
            await connection.rollback().catch(() => {});
            console.error('Reservation cancel error:', error);
            res.status(500).json({ success: false, message: 'Rezervasyon iptal edilemedi!' });
        } finally {
            connection.release();
        }
    });

    // Update reservation
    app.put('/api/reservations/:id', requireAuthenticatedActor, async (req, res) => {
        const { id } = req.params;
        const { reservation_price, dateText, hourText, pitchNumber } = req.body;
        const updates = [];
        const values = [];
        
        if (reservation_price !== undefined) { updates.push('reservation_price = ?'); values.push(reservation_price); }
        if (dateText !== undefined) { 
            const playDateStr = getPlayDateFromDateTextAndHour(dateText, hourText);
            if (!playDateStr) return res.status(400).json({ success: false, message: 'Geçersiz tarih!' });
            if (!isDateWithinTodayAndDays(playDateStr, 30)) {
                return res.status(400).json({ success: false, message: 'Rezervasyon en fazla 30 gün sonrasına ertelenebilir!' });
            }
            updates.push('dateText = ?'); 
            values.push(getTurkishDateTextFromYMD(playDateStr));
            updates.push('play_date = ?');
            values.push(playDateStr);
        }
        if (hourText !== undefined) { updates.push('hourText = ?'); values.push(hourText); }
        if (pitchNumber !== undefined) { updates.push('pitchNumber = ?'); values.push(pitchNumber); }
        
        if (updates.length === 0) return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı!' });
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [id]);
            if (rows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
            }

            const reservation = rows[0];
            const actor = req.reservationActor;
            const allowed = actor.role === 'admin'
                || (actor.role === 'business' && actor.fieldKey === reservation.fieldKey)
                || (actor.role === 'user' && actor.userId === Number(reservation.user_id));
            if (!allowed) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Bu rezervasyonu güncelleyemezsiniz!' });
            }
            if (reservation.status === 'cancelled') {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'İptal edilmiş rezervasyon güncellenemez!' });
            }

            const targetPlayDate = dateText !== undefined
                ? getPlayDateFromDateTextAndHour(dateText, hourText !== undefined ? hourText : reservation.hourText)
                : getDateOnlyString(reservation.play_date);
            if ((dateText !== undefined || hourText !== undefined) && !isDateWithinTodayAndDays(targetPlayDate, 30)) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Rezervasyon en fazla 30 gün sonrasına ertelenebilir!' });
            }
            const targetPitchNumber = pitchNumber !== undefined ? pitchNumber : reservation.pitchNumber;
            const targetHourText = hourText !== undefined ? hourText : reservation.hourText;
            const slotChanged = String(targetPitchNumber) !== String(reservation.pitchNumber)
                || targetPlayDate !== getDateOnlyString(reservation.play_date)
                || targetHourText !== reservation.hourText;

            let releaseLock = async () => {};
            if (slotChanged) {
                releaseLock = await acquireSlotLock(connection, {
                    fieldKey: reservation.fieldKey,
                    pitchNumber: targetPitchNumber,
                    play_date: targetPlayDate,
                    hourText: targetHourText
                });
                const [existing] = await connection.query(
                    'SELECT id, status, type FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND play_date = ? AND hourText = ? AND status NOT IN ("cancelled", "pending_payment") AND id != ? FOR UPDATE',
                    [reservation.fieldKey, targetPitchNumber, targetPlayDate, targetHourText, id]
                );
                if (existing.length > 0) {
                    await connection.rollback();
                    await releaseLock();
                    return res.status(409).json({ success: false, message: 'Hedef saat dilimi kullanılamıyor!' });
                }
            }

            try {
                values.push(id);
                await connection.query(`UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`, values);
                await connection.commit();
            } finally {
                await releaseLock();
            }
            res.json({ success: true, message: 'Rezervasyon güncellendi!' });
        } catch (error) {
            await connection.rollback().catch(() => {});
            console.error('Reservation update error:', error);
            res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
        } finally {
            connection.release();
        }
    });

    // Reserve specific hours
    app.post('/api/reserve-specific-hours', async (req, res) => {
        const { fieldKey, pitchNumber, dateText, play_date, hours, user_name, user_id, reservation_price, payment_status } = req.body;
        if (!fieldKey || !pitchNumber || (!dateText && !play_date) || !hours || !hours.length || !user_name) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        const playDateVal = play_date || parseTurkishDateString(dateText);
        if (!playDateVal || !isDateWithinTodayAndDays(getDateOnlyString(playDateVal), 30)) {
            return res.status(400).json({ success: false, message: 'Rezervasyon en fazla 30 gün sonrası için yapılabilir!' });
        }
        const displayDateText = getTurkishDateTextFromYMD(playDateVal);

        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

            const [userResult] = await connection.query('SELECT id, phone, status FROM users WHERE id = ?', [user_id]);
            if (userResult.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            }
            if (userResult[0].status === 'globally_banned') {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
            }

            const userPhone = userResult[0].phone;
            const [blacklistResults] = await connection.query('SELECT COUNT(*) AS cnt FROM field_blacklists WHERE phone_number = ? AND fieldKey = ?', [userPhone, fieldKey]);
            if (blacklistResults[0].cnt > 0) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Bu sahada kara listeye alındınız!' });
            }

            const conflicts = [];
            let succeeded = 0;

            for (const hour of hours) {
                const dummyReservation = { fieldKey, pitchNumber, play_date: playDateVal, hourText: hour };
                const releaseLock = await acquireSlotLock(connection, dummyReservation);
                try {
                    const [existing] = await connection.query(
                        'SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND play_date = ? AND hourText = ? AND status NOT IN ("cancelled", "pending_payment") FOR UPDATE',
                        [fieldKey, pitchNumber, playDateVal, hour]
                    );
                    if (existing.length > 0) {
                        conflicts.push(hour);
                    } else {
                        await connection.query(
                            'INSERT INTO reservations (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status, status, type, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending_payment", "normal", "online")',
                            [fieldKey, pitchNumber, displayDateText, playDateVal, hour, user_name, user_id, reservation_price || 0, payment_status || 'odenmedi']
                        );
                        succeeded++;
                    }
                } finally {
                    await releaseLock();
                }
            }

            await connection.commit();
            res.json({
                success: true,
                message: conflicts.length > 0 ? `${succeeded} saat başarıyla rezerve edildi. ${conflicts.length} saat dolu olduğu için atlandı.` : 'Tüm saatler başarıyla rezerve edildi!',
                conflicts
            });
        } catch (error) {
            await connection.rollback().catch(() => {});
            console.error('Reserve specific hours error:', error);
            res.status(500).json({ success: false, message: 'Rezervasyon hatası!' });
        } finally {
            connection.release();
        }
    });

    // Get user reservations
    app.get('/api/user-reservations', (req, res) => {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: 'user_id zorunludur!' });
        db.query(
            `SELECT r.*, u.phone AS user_phone FROM reservations r LEFT JOIN users u ON r.user_id = u.id WHERE r.user_id = ? AND r.status = 'active' ORDER BY r.play_date DESC, r.hourText DESC`,
            [user_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    // Get reservation by id
    app.get('/api/reservations/:id', (req, res) => {
        const { id } = req.params;
        db.query('SELECT * FROM reservations WHERE id = ?', [id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
            res.json(results[0]);
        });
    });

    // Block/unblock pitch slot
    app.put('/api/reservations/:id/block', (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        db.query('UPDATE reservations SET status = ? WHERE id = ?', [status || 'blocked', id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
            res.json({ success: true, message: 'Saat dilimi güncellendi!' });
        });
    });

    // Update reservation user
    app.put('/api/reservations/:id/user', (req, res) => {
        const { id } = req.params;
        const { user_id, user_name } = req.body;
        db.query('UPDATE reservations SET user_id = ?, user_name = ? WHERE id = ?', [user_id, user_name, id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
            res.json({ success: true, message: 'Rezervasyon kullanıcısı güncellendi!' });
        });
    });



    // Update payment status
    app.put('/api/reservations/:id/payment', requireAuthenticatedActor, async (req, res) => {
        const { id } = req.params;
        const { payment_status } = req.body;
        if (!['odenmedi', 'odendi'].includes(payment_status)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ödeme durumu!' });
        }
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [id]);
            if (rows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
            }
            const reservation = rows[0];
            const actor = req.reservationActor;
            const allowed = actor.role === 'admin' || (actor.role === 'business' && actor.fieldKey === reservation.fieldKey);
            if (!allowed) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Ödeme durumunu değiştiremezsiniz!' });
            }
            if (reservation.payment_status !== payment_status) {
                const method = reservation.payment_method || (reservation.type === 'manual' || reservation.type === 'abone' ? 'cash' : 'online');
                await connection.query('UPDATE reservations SET payment_status = ?, payment_method = ? WHERE id = ?', [payment_status, method, id]);
                if (payment_status === 'odendi') {
                    await enqueueTelegramNotification(connection, id, 'paid', { payment_type: method === 'cash' ? 'manual_cash' : 'single' });
                }
            }
            await connection.commit();
            res.json({ success: true, message: 'Ödeme durumu güncellendi!' });
        } catch (error) {
            await connection.rollback().catch(() => {});
            console.error('Manual payment update error:', error);
            res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        } finally {
            connection.release();
        }
    });
}

function getActualPlayDate(dateText, hourText) {
    if (!dateText) return null;
    try {
        const months = {
            'OCAK': 0, 'ŞUBAT': 1, 'MART': 2, 'NİSAN': 3, 'MAYIS': 4, 'HAZİRAN': 5,
            'TEMMUZ': 6, 'AĞUSTOS': 7, 'EYLÜL': 8, 'EKİM': 9, 'KASIM': 10, 'ARALIK': 11
        };
        const parts = dateText.split(' ');
        if (parts.length < 3) return null;
        const day = parseInt(parts[0]);
        const monthName = parts[1].toLocaleUpperCase('tr-TR');
        const year = parseInt(parts[2]);
        const month = months[monthName];
        if (isNaN(day) || month === undefined || isNaN(year)) return null;
        return new Date(year, month, day);
    } catch (e) {
        return null;
    }
}

function parseTurkishDateString(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
        return dateStr.trim();
    }
    const turkishMonthsDotted = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
    const turkishMonthsUndotted = ['OCAK', 'SUBAT', 'MART', 'NISAN', 'MAYIS', 'HAZIRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];
    
    const parts = dateStr.trim().split(' ');
    if (parts.length < 2) return null;
    const day = parseInt(parts[0]);
    
    const monthStr = parts[1].toLocaleUpperCase('tr-TR');
    
    const normalize = (str) => {
        return str
            .replace(/İ/g, 'I')
            .replace(/Ş/g, 'S')
            .replace(/Ç/g, 'C')
            .replace(/Ğ/g, 'G')
            .replace(/Ü/g, 'U')
            .replace(/Ö/g, 'O');
    };
    
    let monthIdx = turkishMonthsDotted.indexOf(monthStr);
    if (monthIdx === -1) {
        monthIdx = turkishMonthsUndotted.indexOf(monthStr);
    }
    if (monthIdx === -1) {
        monthIdx = turkishMonthsUndotted.indexOf(normalize(monthStr));
    }
    
    if (monthIdx === -1 && monthStr.length >= 3) {
        const sub3 = monthStr.substring(0, 3);
        const dotted3 = turkishMonthsDotted.map(m => m.substring(0, 3));
        const undotted3 = turkishMonthsUndotted.map(m => m.substring(0, 3));
        
        monthIdx = dotted3.indexOf(sub3);
        if (monthIdx === -1) {
            monthIdx = undotted3.indexOf(sub3);
        }
        if (monthIdx === -1) {
            monthIdx = undotted3.indexOf(normalize(sub3));
        }
    }
    
    if (monthIdx === -1) return null;
    
    let year;
    if (parts.length >= 3) {
        year = parseInt(parts[2]);
    } else {
        const today = new Date();
        year = today.getFullYear();
        if (monthIdx < today.getMonth()) {
            year += 1;
        }
    }
    
    if (isNaN(year)) return null;
    
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

function getPlayDateFromDateTextAndHour(dateText, hourText) {
    const playDateStr = parseTurkishDateString(dateText);
    if (!playDateStr) return null;

    const [year, month, day] = playDateStr.split('-').map(Number);
    const playDate = new Date(year, month - 1, day);
    const startHour = parseInt(String(hourText || '').split(' - ')[0], 10);
    if (!Number.isNaN(startHour) && startHour < 6) {
        playDate.setDate(playDate.getDate() + 1);
    }
    return formatDateYMD(playDate);
}

function getDateOnlyString(value) {
    if (!value) return '';
    if (value instanceof Date) return formatDateYMD(value);
    return String(value).split('T')[0];
}

function getTurkishDateTextFromYMD(value) {
    const [year, month, day] = getDateOnlyString(value).split('-').map(Number);
    if (!year || !month || !day) return '';
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR');
}

function formatDateYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isDateWithinTodayAndDays(dateStr, days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + days);

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate >= today && targetDate <= maxDate;
}

module.exports = { initReservationRoutes };
