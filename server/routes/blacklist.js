function initBlacklistRoutes(app, db) {
    // Get blacklist (query param version)
    app.get('/api/blacklist', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });
        db.query('SELECT * FROM field_blacklists WHERE fieldKey = ? ORDER BY created_at DESC', [fieldKey], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json(results);
        });
    });

    // Get blacklist (path param version)
    app.get('/api/blacklist/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        db.query('SELECT * FROM field_blacklists WHERE fieldKey = ? ORDER BY created_at DESC', [fieldKey], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Get blacklist by phone (check all fields)
    app.get('/api/blacklists/by-phone/:phone', (req, res) => {
        const { phone } = req.params;
        db.query('SELECT fieldKey FROM field_blacklists WHERE phone_number = ?', [phone], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results.map(r => r.fieldKey) });
        });
    });

    // Add to blacklist
    app.post('/api/blacklist', (req, res) => {
        const { fieldKey, phone_number, reason } = req.body;
        if (!fieldKey || !phone_number) return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });

        db.query('SELECT COUNT(*) AS cnt FROM field_blacklists WHERE fieldKey = ? AND phone_number = ?', [fieldKey, phone_number], (errCheck, checkRes) => {
            if (errCheck) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (checkRes[0].cnt > 0) return res.status(409).json({ success: false, message: 'Bu numara zaten kara listede!' });

            db.query('SELECT id, name FROM users WHERE phone = ?', [phone_number], (errUser, userRes) => {
                if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                const userId = userRes.length > 0 ? userRes[0].id : null;
                const userName = userRes.length > 0 ? userRes[0].name : null;

                db.query('INSERT INTO field_blacklists (fieldKey, phone_number, user_id, reason) VALUES (?, ?, ?, ?)', [fieldKey, phone_number, userId, reason || 'Bildirilmemiş'], (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Kara liste eklenemedi!' });

                    db.query('SELECT COUNT(*) AS cnt FROM field_blacklists WHERE phone_number = ?', [phone_number], (errCount, countRes) => {
                        if (errCount) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                        if (countRes[0].cnt >= 3) {
                            db.query("UPDATE users SET status = 'globally_banned' WHERE phone = ?", [phone_number], (errBan) => {
                                if (errBan) console.error('Global ban hatası:', errBan);
                            });
                        }
                        res.json({ success: true, message: 'Numara kara listeye eklendi!' });
                    });
                });
            });
        });
    });

    // Remove from blacklist (by id)
    app.delete('/api/blacklist/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM field_blacklists WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Kara listeden çıkarılamadı!' });
            res.json({ success: true, message: 'Numara kara listeden çıkarıldı!' });
        });
    });

    // Remove from blacklist (by fieldKey and phone)
    app.delete('/api/blacklist/:fieldKey/:phone', (req, res) => {
        const { fieldKey, phone } = req.params;
        db.query('DELETE FROM field_blacklists WHERE fieldKey = ? AND phone_number = ?', [fieldKey, phone], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Kara listeden çıkarılamadı!' });
            res.json({ success: true, message: 'Numara kara listeden çıkarıldı!' });
        });
    });
}

module.exports = { initBlacklistRoutes };
