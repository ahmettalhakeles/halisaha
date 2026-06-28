function initForumRoutes(app, db) {
    // Get forum posts for a field
    app.get('/api/forum', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });
        db.query(
            `SELECT fp.*, u.name AS user_name, u.phone AS user_phone, u.email AS user_email
             FROM forum_posts fp LEFT JOIN users u ON fp.user_id = u.id
             WHERE fp.fieldKey = ? ORDER BY fp.created_at DESC`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json(results);
            }
        );
    });

    // Create forum post
    app.post('/api/forum', (req, res) => {
        const { fieldKey, user_id, title, content } = req.body;
        if (!fieldKey || !title || !content) return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });

        db.query('SELECT id, name, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
            if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (userResult.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            if (userResult[0].status === 'globally_banned') return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır!' });

            db.query('INSERT INTO forum_posts (fieldKey, user_id, title, content) VALUES (?, ?, ?, ?)', [fieldKey, user_id, title, content], (errInsert) => {
                if (errInsert) return res.status(500).json({ success: false, message: 'Forum gönderisi oluşturulamadı!' });
                res.json({ success: true, message: 'Forum gönderisi başarıyla oluşturuldu!' });
            });
        });
    });

    // Delete forum post
    app.delete('/api/forum/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM forum_posts WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Forum gönderisi silinemedi!' });
            res.json({ success: true, message: 'Forum gönderisi başarıyla silindi!' });
        });
    });
}

module.exports = { initForumRoutes };
