function initForumRoutes(app, db) {
    // Get all forum posts
    app.get('/api/forum', (req, res) => {
        db.query(
            `SELECT fp.*, u.name AS user_name, u.phone AS user_phone, u.email AS user_email
             FROM forum_posts fp LEFT JOIN users u ON fp.user_id = u.id
             ORDER BY fp.created_at DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, data: results });
            }
        );
    });

    // Create forum post
    app.post('/api/forum', (req, res) => {
        const { dateText, hourText, position, payment, phone, msg, user_id } = req.body;
        if (!dateText || !hourText || !position || !payment) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        if (user_id) {
            db.query('SELECT id, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
                if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (userResult.length > 0 && userResult[0].status === 'globally_banned') {
                    return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır!' });
                }
                doInsert();
            });
        } else {
            doInsert();
        }

        function doInsert() {
            db.query(
                'INSERT INTO forum_posts (dateText, hourText, position, payment, phone, msg, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [dateText, hourText, position, payment, phone || null, msg || null, user_id || null, 'aktif'],
                (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: 'İlan kaydedilemedi!' });
                    res.json({ success: true, message: 'İlan başarıyla yayınlandı!' });
                }
            );
        }
    });

    // Mark forum post as found
    app.put('/api/forum/:id/found', (req, res) => {
        const { id } = req.params;
        const { user_id } = req.body;

        db.query('SELECT user_id FROM forum_posts WHERE id = ?', [id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
            if (results[0].user_id && parseInt(results[0].user_id) !== parseInt(user_id)) {
                return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
            }
            db.query("UPDATE forum_posts SET status = 'bulundu' WHERE id = ?", [id], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
                res.json({ success: true, message: 'İlan bulundu olarak işaretlendi!' });
            });
        });
    });

    // Delete forum post (admin/business use)
    app.delete('/api/forum/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM forum_posts WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'İlan silinemedi!' });
            res.json({ success: true, message: 'İlan başarıyla silindi!' });
        });
    });

    // Get forum comments
    app.get('/api/forum-comments/:type/:postId', (req, res) => {
        const { type, postId } = req.params;
        db.query('SELECT * FROM forum_comments WHERE post_type = ? AND post_id = ? ORDER BY created_at ASC', [type, postId], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Create forum comment
    app.post('/api/forum-comments', (req, res) => {
        const { post_type, post_id, commenter_name, comment } = req.body;
        if (!post_type || !post_id || !commenter_name || !comment) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }
        db.query('INSERT INTO forum_comments (post_type, post_id, commenter_name, comment) VALUES (?, ?, ?, ?)',
            [post_type, post_id, commenter_name, comment],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Yorum kaydedilemedi!' });
                res.json({ success: true, message: 'Yorum eklendi!' });
            }
        );
    });
}

module.exports = { initForumRoutes };
