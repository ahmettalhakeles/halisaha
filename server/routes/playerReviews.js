function initPlayerReviewRoutes(app, db) {
    // Get player reviews by player_id (user_id)
    app.get('/api/player-reviews/:playerId', (req, res) => {
        const { playerId } = req.params;
        db.query('SELECT * FROM player_reviews WHERE player_id = ? ORDER BY created_at DESC', [playerId], (err, results) => {
            if (err) {
                console.error('Yorum çekme hatası:', err);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }

            let totalRating = 0;
            results.forEach(r => totalRating += r.rating);
            const averageRating = results.length > 0 ? parseFloat((totalRating / results.length).toFixed(1)) : 0;

            res.json({
                success: true,
                data: {
                    player_id: parseInt(playerId),
                    reviews: results,
                    averageRating: averageRating,
                    reviewCount: results.length
                }
            });
        });
    });

    // Create player review
    app.post('/api/player-reviews', (req, res) => {
        const { player_id, reviewerName, rating, comment } = req.body;
        if (!player_id || !reviewerName || !rating) {
            return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurunuz!' });
        }

        const ratingVal = parseInt(rating);
        if (ratingVal < 1 || ratingVal > 5) {
            return res.status(400).json({ success: false, message: 'Puan 1-5 arasında olmalıdır!' });
        }

        db.query('INSERT INTO player_reviews (player_id, reviewerName, rating, comment) VALUES (?, ?, ?, ?)',
            [player_id, reviewerName, ratingVal, comment || ''],
            (err) => {
                if (err) {
                    console.error('Yorum ekleme hatası:', err);
                    return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                }
                res.json({ success: true, message: 'Değerlendirmeniz başarıyla kaydedildi!' });
            }
        );
    });
}

module.exports = { initPlayerReviewRoutes };
