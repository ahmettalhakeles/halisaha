function initReviewRoutes(app, db) {
    // Get reviews for a field
    app.get('/api/reviews', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });
        db.query(
            `SELECT pr.*, u.name AS user_name FROM player_reviews pr LEFT JOIN users u ON pr.user_id = u.id WHERE pr.fieldKey = ? ORDER BY pr.created_at DESC`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    // Create review
    app.post('/api/reviews', (req, res) => {
        const { fieldKey, user_id, rating, comment } = req.body;
        if (!fieldKey || !rating || !comment) return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });

        db.query('SELECT id, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
            if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (userResult.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            if (userResult[0].status === 'globally_banned') return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır!' });

            db.query('INSERT INTO player_reviews (fieldKey, user_id, rating, comment) VALUES (?, ?, ?, ?)', [fieldKey, user_id, rating, comment], (errInsert) => {
                if (errInsert) return res.status(500).json({ success: false, message: 'Yorum oluşturulamadı!' });
                res.json({ success: true, message: 'Yorum başarıyla eklendi!' });
            });
        });
    });

    // Delete review
    app.delete('/api/reviews/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM player_reviews WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Yorum silinemedi!' });
            res.json({ success: true, message: 'Yorum başarıyla silindi!' });
        });
    });
}

module.exports = { initReviewRoutes };
