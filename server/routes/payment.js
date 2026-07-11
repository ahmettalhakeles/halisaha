const crypto = require('crypto');
const { beginTransaction, commitTransaction, rollbackTransaction } = require('../middleware/paymentLock');

function initPaymentRoutes(app, db) {
    // Helper function to generate a random 8-char share code
    const generateShareCode = () => {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    };

    // Initialize split payment
    app.post('/api/reservations/:id/payment/init', async (req, res) => {
        const reservationId = req.params.id;
        const connection = await db.promise().getConnection();
        
        try {
            await beginTransaction(connection);
            
            // Check if reservation exists and is active
            const [reservations] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [reservationId]);
            if (reservations.length === 0) {
                await rollbackTransaction(connection);
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
            }
            
            const reservation = reservations[0];
            if (reservation.status !== 'active' && reservation.status !== 'blocked') {
                await rollbackTransaction(connection);
                return res.status(400).json({ success: false, message: 'Bu rezervasyon aktif değil.' });
            }
            
            if (reservation.payment_status === 'odendi') {
                await rollbackTransaction(connection);
                return res.status(400).json({ success: false, message: 'Bu rezervasyonun ödemesi zaten yapılmış.' });
            }

            // Check if there is already an active payment group
            const [existingGroups] = await connection.query('SELECT * FROM payment_groups WHERE reservation_id = ? AND status IN ("pending", "active")', [reservationId]);
            if (existingGroups.length > 0) {
                await rollbackTransaction(connection);
                return res.json({ 
                    success: true, 
                    share_code: existingGroups[0].share_code, 
                    message: 'Zaten aktif bir ortak ödeme başlatılmış.' 
                });
            }
            
            const shareCode = generateShareCode();
            const totalAmount = reservation.reservation_price;
            const shareAmount = Math.ceil(totalAmount / 2);
            
            await connection.query(
                'INSERT INTO payment_groups (reservation_id, share_code, total_amount, share_amount, status) VALUES (?, ?, ?, ?, "pending")',
                [reservationId, shareCode, totalAmount, shareAmount]
            );
            
            await commitTransaction(connection);
            res.json({ success: true, share_code: shareCode });
        } catch (error) {
            await rollbackTransaction(connection);
            console.error('Payment init error:', error);
            res.status(500).json({ success: false, message: 'Ortak ödeme başlatılamadı.' });
        } finally {
            connection.release();
        }
    });

    // Pay single (simulation)
    app.post('/api/reservations/:id/payment/pay-single', async (req, res) => {
        const reservationId = req.params.id;
        const connection = await db.promise().getConnection();
        
        try {
            const [reservations] = await connection.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
            if (reservations.length === 0) {
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
            }
            
            await connection.query('UPDATE reservations SET payment_status = "odendi" WHERE id = ?', [reservationId]);
            
            res.json({ success: true, message: 'Ödeme başarılı!' });
        } catch (error) {
            console.error('Pay single error:', error);
            res.status(500).json({ success: false, message: 'Ödeme işlemi başarısız oldu.' });
        } finally {
            connection.release();
        }
    });

    // Get share link details
    app.get('/api/payment/share/:code', async (req, res) => {
        const shareCode = req.params.code;
        const connection = await db.promise().getConnection();
        
        try {
            const [groups] = await connection.query(
                `SELECT pg.*, r.fieldKey, r.dateText, r.hourText, r.pitchNumber, r.user_name as res_owner
                 FROM payment_groups pg 
                 JOIN reservations r ON pg.reservation_id = r.id 
                 WHERE pg.share_code = ?`, 
                [shareCode]
            );
            
            if (groups.length === 0) {
                return res.status(404).json({ success: false, message: 'Geçersiz paylaşım kodu.' });
            }
            
            const group = groups[0];
            
            // Check if expired
            if (group.status === 'active' && group.deadline && new Date() > new Date(group.deadline)) {
                await connection.query('UPDATE payment_groups SET status = "expired" WHERE id = ?', [group.id]);
                group.status = 'expired';
            }
            
            res.json({ success: true, data: group });
        } catch (error) {
            console.error('Get share link error:', error);
            res.status(500).json({ success: false, message: 'Veriler alınamadı.' });
        } finally {
            connection.release();
        }
    });

    // Pay shared (simulation)
    app.post('/api/payment/share/:code/pay', async (req, res) => {
        const shareCode = req.params.code;
        const payerName = req.body.payer_name || 'Anonim';
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        const connection = await db.promise().getConnection();
        
        try {
            await beginTransaction(connection);
            
            // Lock the group row
            const [groups] = await connection.query('SELECT * FROM payment_groups WHERE share_code = ? FOR UPDATE', [shareCode]);
            
            if (groups.length === 0) {
                await rollbackTransaction(connection);
                return res.status(404).json({ success: false, message: 'Geçersiz paylaşım kodu.' });
            }
            
            const group = groups[0];
            
            if (group.status === 'completed') {
                await rollbackTransaction(connection);
                return res.status(400).json({ success: false, message: 'Bu ortak ödeme zaten tamamlanmıştır.' });
            }
            
            if (group.status === 'expired' || (group.deadline && new Date() > new Date(group.deadline))) {
                if (group.status !== 'expired') {
                    await connection.query('UPDATE payment_groups SET status = "expired" WHERE id = ?', [group.id]);
                }
                await rollbackTransaction(connection);
                return res.status(400).json({ success: false, message: 'Ödeme süresi dolmuştur.' });
            }
            
            // Insert payment share record
            await connection.query(
                'INSERT INTO payment_shares (group_id, payer_name, amount, ip_address) VALUES (?, ?, ?, ?)',
                [group.id, payerName, group.share_amount, clientIp]
            );
            
            if (group.paid_count === 0) {
                // First payment
                const deadlineDate = new Date();
                deadlineDate.setMinutes(deadlineDate.getMinutes() + 30);
                
                await connection.query(
                    'UPDATE payment_groups SET paid_count = 1, status = "active", first_paid_at = NOW(), deadline = ? WHERE id = ?',
                    [deadlineDate, group.id]
                );
                
                await commitTransaction(connection);
                res.json({ success: true, paid_count: 1, status: 'active', message: 'İlk ödeme başarıyla alındı. İkinci kişinin ödemesi bekleniyor.' });
                
            } else if (group.paid_count === 1) {
                // Second payment
                await connection.query('UPDATE payment_groups SET paid_count = 2, status = "completed" WHERE id = ?', [group.id]);
                
                // Update reservation to paid
                await connection.query('UPDATE reservations SET payment_status = "odendi" WHERE id = ?', [group.reservation_id]);
                
                await commitTransaction(connection);
                res.json({ success: true, paid_count: 2, status: 'completed', message: 'Tüm ödemeler başarıyla alındı! Rezervasyon onaylandı.' });
            } else {
                await rollbackTransaction(connection);
                res.status(400).json({ success: false, message: 'Bu ortak ödeme zaten tamamlanmıştır.' });
            }
            
        } catch (error) {
            await rollbackTransaction(connection);
            console.error('Pay share error:', error);
            res.status(500).json({ success: false, message: 'Ödeme işlemi başarısız oldu.' });
        } finally {
            connection.release();
        }
    });
}

module.exports = { initPaymentRoutes };
