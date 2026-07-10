function initSubscriptionRoutes(app, db) {
    // Get subscriptions (query param version)
    app.get('/api/subscriptions', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });
        db.query(
            `SELECT s.*, u.name AS subscriberName, u.phone AS user_phone
             FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id
             WHERE s.fieldKey = ? ORDER BY s.subscriberName`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    // Get subscriptions (path param version)
    app.get('/api/subscriptions/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        db.query(
            `SELECT s.*, u.name AS subscriberName, u.phone AS user_phone
             FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id
             WHERE s.fieldKey = ? ORDER BY s.pitchNumber ASC, FIELD(s.dayOfWeek, 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'), s.hourText ASC`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json({ success: true, data: results });
            }
        );
    });

    // Get subscriptions by user
    app.get('/api/subscriptions/by-user/:userId', (req, res) => {
        const { userId } = req.params;
        db.query(
            `SELECT s.*, u.name AS subscriberName, u.phone AS user_phone
             FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id
             WHERE s.user_id = ? ORDER BY FIELD(s.dayOfWeek, 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'), s.hourText ASC`,
            [userId],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json({ success: true, data: results });
            }
        );
    });

    // Create subscription
    app.post('/api/subscriptions', (req, res) => {
        const { fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, user_id, subscriberPhone } = req.body;
        if (!fieldKey || !pitchNumber || !hourText || !subscriberName) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        const subDay = dayOfWeek || 'PAZARTESİ';

        db.query('INSERT INTO subscriptions (fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, user_id, subscriberPhone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fieldKey, pitchNumber, subDay, hourText, subscriberName, user_id || null, subscriberPhone || null],
            (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Bu abonelik zaten mevcut!' });
                    return res.status(500).json({ success: false, message: 'Abonelik oluşturulamadı!' });
                }

                // Create initial reservation for next occurrence
                const dayNames = ["PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"];
                const todayIndex = new Date().getDay();
                const targetIndex = dayNames.indexOf(subDay);
                let daysUntil = targetIndex - todayIndex;
                if (daysUntil <= 0) daysUntil += 7;
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + daysUntil);
                const dateText = nextDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');
                const yyyy = nextDate.getFullYear();
                const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
                const dd = String(nextDate.getDate()).padStart(2, '0');
                const play_date = `${yyyy}-${mm}-${dd}`;

                db.query('INSERT INTO reservations (fieldKey, pitchNumber, dateText, play_date, hourText, user_name, user_id, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, 0, "odenmedi", "active", "abone")',
                    [fieldKey, pitchNumber, dateText, play_date, hourText, subscriberName, user_id || null],
                    (insErr) => {
                        if (insErr) console.error('Abone rezervasyon kaydı oluşturma hatası:', insErr);
                    }
                );

                res.json({ success: true, message: 'Abonelik başarıyla oluşturuldu!' });
            }
        );
    });

    // Delete subscription
    app.delete('/api/subscriptions/:id', (req, res) => {
        const { id } = req.params;

        db.query('SELECT * FROM subscriptions WHERE id = ?', [id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Abonelik bulunamadı!' });

            const { fieldKey, pitchNumber, dayOfWeek, hourText } = results[0];

            db.query('DELETE FROM subscriptions WHERE id = ?', [id], (delErr) => {
                if (delErr) return res.status(500).json({ success: false, message: 'Abonelik silinemedi!' });

                // Delete related reservations
                db.query("DELETE FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND hourText = ? AND type = 'abone'",
                    [fieldKey, pitchNumber, hourText],
                    (delResErr) => {
                        if (delResErr) console.error('Abone rezervasyonları silinirken hata:', delResErr);
                    }
                );

                res.json({ success: true, message: 'Abonelik başarıyla silindi!' });
            });
        });
    });
}

module.exports = { initSubscriptionRoutes };
