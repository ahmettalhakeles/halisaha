function initReservationRoutes(app, db) {
    const { resLimitPerMin, resLimitPerSec } = require('../middleware/rateLimiter');

    // Get reservations
    app.get('/api/reservations', (req, res) => {
        const { fieldKey, date } = req.query;
        if (!fieldKey || !date) return res.status(400).json({ success: false, message: 'fieldKey ve date parametreleri zorunludur!' });
        db.query(
            `SELECT r.id, r.fieldKey, r.pitchNumber, r.dateText, r.hourText, r.user_name, r.user_id, u.phone AS user_phone, r.reservation_price, r.payment_status, r.status, r.is_bot, r.type
             FROM reservations r LEFT JOIN users u ON r.user_id = u.id
             WHERE r.fieldKey = ? AND r.dateText = ? AND r.status IN ('active', 'blocked', 'blocked_yuksek')`,
            [fieldKey, date],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    // Create reservation
    app.post('/api/reservations', resLimitPerMin, resLimitPerSec, (req, res) => {
        const { fieldKey, pitchNumber, dateText, hourText, user_name, user_id, reservation_price, payment_status } = req.body;
        if (!fieldKey || !pitchNumber || !dateText || !hourText || !user_name) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        db.query('SELECT id, name, phone, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
            if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (userResult.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            if (userResult[0].status === 'globally_banned') return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });

            const userPhone = userResult[0].phone;

            db.query('SELECT COUNT(*) AS cnt FROM field_blacklists WHERE phone_number = ? AND fieldKey = ?', [userPhone, fieldKey], (errBlacklist, blacklistResults) => {
                if (errBlacklist) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (blacklistResults[0].cnt > 0) return res.status(403).json({ success: false, message: 'Bu sahada kara listeye alındınız! Rezervasyon yapamazsınız.' });

                db.query('SELECT id, status, type FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ?', [fieldKey, pitchNumber, dateText, hourText], (errCheck, existing) => {
                    if (errCheck) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                    if (existing.length > 0) {
                        if (existing[0].status === 'active') return res.status(409).json({ success: false, message: 'Bu saat dilimi zaten dolu!' });
                        if (existing[0].status === 'blocked') return res.status(409).json({ success: false, message: 'Bu saat dilimi işletme tarafından engellenmiş!' });
                        if (existing[0].status === 'blocked_yuksek') return res.status(409).json({ success: false, message: 'Bu saat dilimi yoğunluk nedeniyle kullanılamıyor!' });
                        if (existing[0].type === 'abone') return res.status(409).json({ success: false, message: 'Bu saat dilimi abonelik için ayrılmış!' });
                    }

                    db.query('INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_id, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "active", "normal")', [fieldKey, pitchNumber, dateText, hourText, user_name, user_id, reservation_price || 0, payment_status || 'odenmedi'], (errInsert) => {
                        if (errInsert) return res.status(500).json({ success: false, message: 'Rezervasyon oluşturulamadı!' });
                        res.json({ success: true, message: 'Rezervasyon başarıyla oluşturuldu!' });
                    });
                });
            });
        });
    });

    // Cancel reservation
    app.delete('/api/reservations/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM reservations WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Rezervasyon iptal edilemedi!' });
            res.json({ success: true, message: 'Rezervasyon başarıyla iptal edildi!' });
        });
    });

    // Update reservation price/payment
    app.put('/api/reservations/:id', (req, res) => {
        const { id } = req.params;
        const { reservation_price, payment_status } = req.body;
        const updates = [];
        const values = [];
        if (reservation_price !== undefined) { updates.push('reservation_price = ?'); values.push(reservation_price); }
        if (payment_status !== undefined) { updates.push('payment_status = ?'); values.push(payment_status); }
        if (updates.length === 0) return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı!' });
        values.push(id);
        db.query(`UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
            res.json({ success: true, message: 'Rezervasyon güncellendi!' });
        });
    });

    // Reserve specific hours
    app.post('/api/reserve-specific-hours', (req, res) => {
        const { fieldKey, pitchNumber, dateText, hours, user_name, user_id, reservation_price, payment_status } = req.body;
        if (!fieldKey || !pitchNumber || !dateText || !hours || !hours.length || !user_name) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

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
                        db.query('SELECT id, status, type FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ?', [fieldKey, pitchNumber, dateText, hour], (errCheck, existing) => {
                            if (errCheck) return reject(errCheck);
                            if (existing.length > 0) return resolve({ conflict: true, hour });
                            db.query('INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_id, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "active", "normal")', [fieldKey, pitchNumber, dateText, hour, user_name, user_id, reservation_price || 0, payment_status || 'odenmedi'], (errInsert) => {
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
            `SELECT r.*, u.phone AS user_phone FROM reservations r LEFT JOIN users u ON r.user_id = u.id WHERE r.user_id = ? AND r.status = 'active' ORDER BY r.dateText DESC, r.hourText DESC`,
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

    // Get business reservations
    app.get('/api/business-reservations', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });
        db.query(
            `SELECT r.*, u.phone AS user_phone FROM reservations r LEFT JOIN users u ON r.user_id = u.id WHERE r.fieldKey = ? ORDER BY r.dateText DESC, r.hourText DESC`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    // Business debts
    app.get('/api/business-debts', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });
        db.query(
            `SELECT r.*, u.phone AS user_phone FROM reservations r LEFT JOIN users u ON r.user_id = u.id WHERE r.fieldKey = ? AND r.payment_status = 'odenmedi' AND r.status = 'active' ORDER BY r.dateText DESC, r.hourText DESC`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    // Schedule game
    app.post('/api/schedule-game', (req, res) => {
        const { fieldKey, pitchNumber, dateText, hourText, user_name, user_id, playerCount } = req.body;
        if (!fieldKey || !dateText || !hourText || !user_name) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        db.query('SELECT id, phone, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
            if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (userResult.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            if (userResult[0].status === 'globally_banned') return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır!' });

            db.query('SELECT COUNT(*) AS cnt FROM reservations WHERE fieldKey = ? AND dateText = ? AND hourText = ?', [fieldKey, dateText, hourText], (errCheck, existing) => {
                if (errCheck) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (existing[0].cnt > 0) return res.status(409).json({ success: false, message: 'Bu saat dilimi dolu!' });

                db.query('INSERT INTO match_seekers (fieldKey, pitchNumber, dateText, hourText, user_id, user_name, phone, playerCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [fieldKey, pitchNumber || 1, dateText, hourText, user_id, user_name, userResult[0].phone, playerCount || 10], (errInsert) => {
                    if (errInsert) return res.status(500).json({ success: false, message: 'Maç oluşturulamadı!' });
                    res.json({ success: true, message: 'Maç başarıyla oluşturuldu!' });
                });
            });
        });
    });
}

module.exports = { initReservationRoutes };
