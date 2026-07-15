const { checkAndCancelExpiredPayments } = require('./payment');

function initReservationRoutes(app, db) {
    const { resLimitPerMin, resLimitPerSec } = require('../middleware/rateLimiter');
    const { requireAuthenticatedActor } = require('../middleware/businessAuth');
    const { enqueueTelegramNotification } = require('../utils/telegram');

    // Get all reservations
    app.get('/api/reservations', async (req, res) => {
        await checkAndCancelExpiredPayments(db);
        const sqlQuery = `
            SELECT r.*, pg.status AS pg_status, pg.paid_count AS pg_paid_count, pg.share_amount AS pg_share_amount
            FROM reservations r
            LEFT JOIN payment_groups pg ON r.id = pg.reservation_id
            ORDER BY r.created_at DESC
        `;
        db.query(sqlQuery, (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Create reservation
    app.post('/api/reservations', resLimitPerMin, resLimitPerSec, (req, res) => {
        const { fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status } = req.body;
        if (!fieldKey || !pitchNumber || (!dateText && !play_date) || !hourText || !user_name) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        const playDateVal = play_date || parseTurkishDateString(dateText);
        const displayDateText = dateText || (play_date ? new Date(play_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR') : '');

        db.query('SELECT id, name, phone, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
            if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (userResult.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            if (userResult[0].status === 'globally_banned') return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });

            const userPhone = userResult[0].phone;

            db.query('SELECT COUNT(*) AS cnt FROM field_blacklists WHERE phone_number = ? AND fieldKey = ?', [userPhone, fieldKey], (errBlacklist, blacklistResults) => {
                if (errBlacklist) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (blacklistResults[0].cnt > 0) return res.status(403).json({ success: false, message: 'Bu sahada kara listeye alındınız! Rezervasyon yapamazsınız.' });

                db.query('SELECT id, status, type FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND (play_date = ? OR dateText = ?) AND hourText = ?', [fieldKey, pitchNumber, playDateVal, displayDateText, hourText], (errCheck, existing) => {
                    if (errCheck) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                    if (existing.length > 0) {
                        if (existing[0].status === 'active') return res.status(409).json({ success: false, message: 'Bu saat dilimi zaten dolu!' });
                        if (existing[0].status === 'blocked') return res.status(409).json({ success: false, message: 'Bu saat dilimi işletme tarafından engellenmiş!' });
                        if (existing[0].status === 'blocked_yuksek') return res.status(409).json({ success: false, message: 'Bu saat dilimi yoğunluk nedeniyle kullanılamıyor!' });
                        if (existing[0].type === 'abone') return res.status(409).json({ success: false, message: 'Bu saat dilimi abonelik için ayrılmış!' });
                    }

                    db.query('INSERT INTO reservations (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending_payment", "normal")', [fieldKey, pitchNumber, displayDateText, playDateVal, hourText, user_name, user_id, reservation_price || 0, payment_status || 'odenmedi'], (errInsert, insertResult) => {
                        if (errInsert) return res.status(500).json({ success: false, message: 'Rezervasyon oluşturulamadı!' });
                        res.json({ success: true, message: 'Rezervasyon başarıyla oluşturuldu!', id: insertResult.insertId });
                    });
                });
            });
        });
    });

    // Cancel reservation
    app.delete('/api/reservations/:id', requireAuthenticatedActor, async (req, res) => {
        const { id } = req.params;
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            await connection.query(
                `SELECT id FROM payment_groups WHERE reservation_id = ?
                 AND status IN ('pending', 'active') FOR UPDATE`,
                [id]
            );
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
            await connection.query(
                `UPDATE payment_groups SET status = 'expired'
                 WHERE reservation_id = ? AND status IN ('pending', 'active')`,
                [id]
            );
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
    app.put('/api/reservations/:id', (req, res) => {
        const { id } = req.params;
        const { reservation_price, dateText, hourText, pitchNumber } = req.body;
        const updates = [];
        const values = [];
        
        if (reservation_price !== undefined) { updates.push('reservation_price = ?'); values.push(reservation_price); }
        if (dateText !== undefined) { 
            updates.push('dateText = ?'); 
            values.push(dateText); 
            // Calculate and update play_date from dateText using existing helper
            const playDateStr = parseTurkishDateString(dateText);
            if (playDateStr) {
                updates.push('play_date = ?');
                values.push(playDateStr);
            }
        }
        if (hourText !== undefined) { updates.push('hourText = ?'); values.push(hourText); }
        if (pitchNumber !== undefined) { updates.push('pitchNumber = ?'); values.push(pitchNumber); }
        
        if (updates.length === 0) return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı!' });
        values.push(id);
        
        db.query(`UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
            res.json({ success: true, message: 'Rezervasyon güncellendi!' });
        });
    });

    // Reserve specific hours
    app.post('/api/reserve-specific-hours', (req, res) => {
        const { fieldKey, pitchNumber, dateText, play_date, hours, user_name, user_id, reservation_price, payment_status } = req.body;
        if (!fieldKey || !pitchNumber || (!dateText && !play_date) || !hours || !hours.length || !user_name) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        const playDateVal = play_date || parseTurkishDateString(dateText);
        const displayDateText = dateText || (play_date ? new Date(play_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR') : '');

        db.query('SELECT id, phone, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
            if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (userResult.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            if (userResult[0].status === 'globally_banned') return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });

            const userPhone = userResult[0].phone;
            db.query('SELECT COUNT(*) AS cnt FROM field_blacklists WHERE phone_number = ? AND fieldKey = ?', [userPhone, fieldKey], (errBlacklist, blacklistResults) => {
                if (errBlacklist) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (blacklistResults[0].cnt > 0) return res.status(403).json({ success: false, message: 'Bu sahada kara listeye alındınız!' });

                const promises = hours.map(hour => {
                    return new Promise((resolve, reject) => {
                        db.query('SELECT id, status, type FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND (play_date = ? OR dateText = ?) AND hourText = ?', [fieldKey, pitchNumber, playDateVal, displayDateText, hour], (errCheck, existing) => {
                            if (errCheck) return reject(errCheck);
                            if (existing.length > 0) return resolve({ conflict: true, hour });
                            db.query('INSERT INTO reservations (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending_payment", "normal")', [fieldKey, pitchNumber, displayDateText, playDateVal, hour, user_name, user_id, reservation_price || 0, payment_status || 'odenmedi'], (errInsert) => {
                                if (errInsert) return reject(errInsert);
                                resolve({ conflict: false, hour });
                            });
                        });
                    });
                });

                Promise.all(promises).then(results => {
                    const conflicts = results.filter(r => r.conflict).map(r => r.hour);
                    const succeeded = results.filter(r => !r.conflict).length;
                    res.json({
                        success: true,
                        message: conflicts.length > 0 ? `${succeeded} saat başarıyla rezerve edildi. ${conflicts.length} saat dolu olduğu için atlandı.` : 'Tüm saatler başarıyla rezerve edildi!',
                        conflicts
                    });
                }).catch(err => {
                    res.status(500).json({ success: false, message: 'Rezervasyon hatası!' });
                });
            });
        });
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
                await connection.query('UPDATE reservations SET payment_status = ? WHERE id = ?', [payment_status, id]);
                if (payment_status === 'odendi') {
                    await enqueueTelegramNotification(connection, id, 'paid', { payment_type: 'manual' });
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

module.exports = { initReservationRoutes };
