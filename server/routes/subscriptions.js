function initSubscriptionRoutes(app, db) {
    // Get subscriptions for a field
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

    // Create subscription
    app.post('/api/subscriptions', (req, res) => {
        const { fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, user_id, subscriberPhone } = req.body;
        if (!fieldKey || !pitchNumber || !dayOfWeek || !hourText || !subscriberName) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }
        db.query('INSERT INTO subscriptions (fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, user_id, subscriberPhone) VALUES (?, ?, ?, ?, ?, ?, ?)', [fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, user_id || null, subscriberPhone || null], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Bu abonelik zaten mevcut!' });
                return res.status(500).json({ success: false, message: 'Abonelik oluşturulamadı!' });
            }
            res.json({ success: true, message: 'Abonelik başarıyla oluşturuldu!' });
        });
    });

    // Delete subscription
    app.delete('/api/subscriptions/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM subscriptions WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Abonelik silinemedi!' });
            res.json({ success: true, message: 'Abonelik başarıyla silindi!' });
        });
    });
}

module.exports = { initSubscriptionRoutes };
