const crypto = require('crypto');
const { beginTransaction, commitTransaction, rollbackTransaction } = require('../middleware/paymentLock');
const { enqueueTelegramNotification } = require('../utils/telegram');
const { requireAuthenticatedActor } = require('../middleware/businessAuth');
const { acquireSlotLock } = require('../utils/slotLock');

function canAccessReservation(actor, reservation) {
    return actor.role === 'admin'
        || (actor.role === 'business' && actor.fieldKey === reservation.fieldKey)
        || (actor.role === 'user' && actor.userId === Number(reservation.user_id));
}

async function checkAndCancelExpiredPayments(db) {
    try {
        // Delete pending_payment reservations older than 10 minutes
        await db.promise().query(
            `DELETE FROM reservations 
             WHERE status = 'pending_payment' AND created_at < NOW() - INTERVAL 10 MINUTE`
        );

        const [expiredGroups] = await db.promise().query(
            `SELECT id FROM payment_groups WHERE status = 'active' AND deadline < NOW()`
        );
        for (const group of expiredGroups) {
            const connection = await db.promise().getConnection();
            try {
                await connection.beginTransaction();
                const [locked] = await connection.query(
                    `SELECT * FROM payment_groups WHERE id = ? AND status = 'active' AND deadline < NOW() FOR UPDATE`,
                    [group.id]
                );
                if (locked.length === 0) {
                    await connection.rollback();
                    continue;
                }
                const expired = locked[0];
                await connection.query('UPDATE payment_groups SET status = "expired" WHERE id = ?', [expired.id]);
                const [cancelResult] = await connection.query(
                    `UPDATE reservations SET status = 'cancelled', cancelled_at = NOW(),
                     cancelled_by = 'system', cancellation_reason = 'Ortak ödeme süresi doldu'
                     WHERE id = ? AND status != 'cancelled'`,
                    [expired.reservation_id]
                );
                if (cancelResult.affectedRows === 1 && expired.paid_count > 0) {
                    await enqueueTelegramNotification(connection, expired.reservation_id, 'cancelled', {
                        cancellation_reason: 'İlk ödeme sonrası ikinci ödeme süresi doldu'
                    });
                }
                await connection.commit();
            } catch (error) {
                await connection.rollback().catch(() => {});
                throw error;
            } finally {
                connection.release();
            }
        }
    } catch (e) {
        console.error("Expired payment check failed:", e);
    }
}

function initPaymentRoutes(app, db) {
    // Helper function to generate a random 8-char share code
    const generateShareCode = () => {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    };

    // Initialize split payment
    app.post('/api/reservations/:id/payment/init', requireAuthenticatedActor, async (req, res) => {
        const reservationId = req.params.id;
        const connection = await db.promise().getConnection();
        
        try {
            await beginTransaction(connection);
            const [existingGroups] = await connection.query(
                `SELECT * FROM payment_groups WHERE reservation_id = ? AND status IN ('pending', 'active') FOR UPDATE`,
                [reservationId]
            );
            
            // Check if reservation exists and is active
            const [reservations] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [reservationId]);
            if (reservations.length === 0) {
                await rollbackTransaction(connection);
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
            }
            
            const reservation = reservations[0];
            if (!canAccessReservation(req.reservationActor, reservation)) {
                await rollbackTransaction(connection);
                return res.status(403).json({ success: false, message: 'Bu rezervasyon için ödeme başlatamazsınız.' });
            }
            if (!['pending_payment', 'active'].includes(reservation.status)) {
                await rollbackTransaction(connection);
                return res.status(400).json({ success: false, message: 'Bu rezervasyon aktif değil.' });
            }
            
            if (reservation.payment_status === 'odendi') {
                await rollbackTransaction(connection);
                return res.status(400).json({ success: false, message: 'Bu rezervasyonun ödemesi zaten yapılmış.' });
            }

            // Check if there is already an active payment group
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
    app.post('/api/reservations/:id/payment/pay-single', requireAuthenticatedActor, async (req, res) => {
        const reservationId = req.params.id;
        const connection = await db.promise().getConnection();
        let releaseSlot = async () => {};
        
        try {
            await beginTransaction(connection);
            const [paymentGroups] = await connection.query(
                `SELECT id FROM payment_groups WHERE reservation_id = ? AND status IN ('pending', 'active') FOR UPDATE`,
                [reservationId]
            );
            const [reservations] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [reservationId]);
            if (reservations.length === 0) {
                await rollbackTransaction(connection);
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
            }
            const reservation = reservations[0];
            if (!canAccessReservation(req.reservationActor, reservation)) {
                await rollbackTransaction(connection);
                return res.status(403).json({ success: false, message: 'Bu rezervasyon için ödeme yapamazsınız.' });
            }
            if (reservation.status !== 'pending_payment') {
                await rollbackTransaction(connection);
                return res.status(409).json({ success: false, message: 'Bu rezervasyon ödeme kabul etmiyor.' });
            }
            if (reservation.payment_status === 'odendi') {
                await rollbackTransaction(connection);
                return res.json({ success: true, message: 'Ödeme daha önce tamamlanmış.' });
            }
            if (paymentGroups.length > 0) {
                await rollbackTransaction(connection);
                return res.status(409).json({ success: false, message: 'Bu rezervasyon için ortak ödeme başlatılmış.' });
            }
            releaseSlot = await acquireSlotLock(connection, reservation);
            
            // Check if slot is already occupied by another active/abone reservation
            const [activeRes] = await connection.query(
                `SELECT id FROM reservations 
                 WHERE fieldKey = ? AND pitchNumber = ? AND (play_date = ? OR dateText = ?) AND hourText = ? AND status = 'active' AND id != ?`,
                [reservation.fieldKey, reservation.pitchNumber, reservation.play_date, reservation.dateText, reservation.hourText, reservationId]
            );
            if (activeRes.length > 0) {
                await rollbackTransaction(connection);
                return res.status(409).json({ success: false, message: 'Bu saat dilimi başka bir kullanıcı tarafından rezerve edilmiş.' });
            }
            
            await connection.query('UPDATE reservations SET payment_status = "odendi", status = "active" WHERE id = ?', [reservationId]);
            await enqueueTelegramNotification(connection, reservationId, 'paid', { payment_type: 'single' });
            await commitTransaction(connection);
            res.json({ success: true, message: 'Ödeme başarılı!' });
        } catch (error) {
            await rollbackTransaction(connection).catch(() => {});
            console.error('Pay single error:', error);
            res.status(500).json({ success: false, message: 'Ödeme işlemi başarısız oldu.' });
        } finally {
            await releaseSlot();
            connection.release();
        }
    });

    // Get share link details
    app.get('/api/payment/share/:code', async (req, res) => {
        await checkAndCancelExpiredPayments(db);
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
        await checkAndCancelExpiredPayments(db);
        const shareCode = req.params.code;
        const payerName = req.body.payer_name || 'Anonim';
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        const connection = await db.promise().getConnection();
        let releaseSlot = async () => {};
        
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
                    const [cancelResult] = await connection.query(
                        `UPDATE reservations SET status = 'cancelled', cancelled_at = NOW(),
                         cancelled_by = 'system', cancellation_reason = 'Ortak ödeme süresi doldu'
                         WHERE id = ? AND status != 'cancelled'`,
                        [group.reservation_id]
                    );
                    if (cancelResult.affectedRows === 1 && group.paid_count > 0) {
                        await enqueueTelegramNotification(connection, group.reservation_id, 'cancelled', {
                            cancellation_reason: 'İlk ödeme sonrası ikinci ödeme süresi doldu'
                        });
                    }
                }
                await commitTransaction(connection);
                return res.status(400).json({ success: false, message: 'Ödeme süresi dolmuştur.' });
            }

            const [reservations] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [group.reservation_id]);
            if (reservations.length === 0 || reservations[0].status === 'cancelled') {
                await rollbackTransaction(connection);
                return res.status(409).json({ success: false, message: 'Rezervasyon iptal edilmiş veya bulunamıyor.' });
            }
            const reservation = reservations[0];
            if (group.paid_count === 0) {
                releaseSlot = await acquireSlotLock(connection, reservation);
                const [activeRes] = await connection.query(
                    `SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ?
                     AND (play_date = ? OR dateText = ?) AND hourText = ? AND status = 'active' AND id != ?`,
                    [reservation.fieldKey, reservation.pitchNumber, reservation.play_date, reservation.dateText, reservation.hourText, reservation.id]
                );
                if (activeRes.length > 0) {
                    await rollbackTransaction(connection);
                    return res.status(409).json({ success: false, message: 'Bu saat dilimi başka bir rezervasyon tarafından alınmış.' });
                }
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
                
                // Set reservation to active
                await connection.query('UPDATE reservations SET status = "active" WHERE id = ?', [group.reservation_id]);
                
                await commitTransaction(connection);
                res.json({ success: true, paid_count: 1, status: 'active', message: 'İlk ödeme başarıyla alındı. İkinci kişinin ödemesi bekleniyor.' });
                
            } else if (group.paid_count === 1) {
                // Second payment
                await connection.query('UPDATE payment_groups SET paid_count = 2, status = "completed" WHERE id = ?', [group.id]);
                
                // Update reservation to paid
                await connection.query('UPDATE reservations SET payment_status = "odendi" WHERE id = ?', [group.reservation_id]);
                await enqueueTelegramNotification(connection, group.reservation_id, 'paid', { payment_type: 'shared' });
                
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
            await releaseSlot();
            connection.release();
        }
    });
}

module.exports = { initPaymentRoutes, checkAndCancelExpiredPayments };
