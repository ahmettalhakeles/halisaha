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
        await db.promise().query(
            `DELETE FROM reservations
             WHERE status = 'pending_payment' AND created_at < NOW() - INTERVAL 10 MINUTE`
        );
    } catch (e) {
        console.error('Expired payment check failed:', e);
    }
}

function initPaymentRoutes(app, db) {
    app.post('/api/reservations/:id/payment/pay-single', requireAuthenticatedActor, async (req, res) => {
        const reservationId = req.params.id;
        const connection = await db.promise().getConnection();
        let releaseSlot = async () => {};

        try {
            await beginTransaction(connection);
            const [reservations] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [reservationId]);
            if (reservations.length === 0) {
                await rollbackTransaction(connection);
                return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadi.' });
            }
            const reservation = reservations[0];
            if (!canAccessReservation(req.reservationActor, reservation)) {
                await rollbackTransaction(connection);
                return res.status(403).json({ success: false, message: 'Bu rezervasyon icin odeme yapamazsiniz.' });
            }
            if (reservation.payment_status === 'odendi') {
                await rollbackTransaction(connection);
                return res.json({ success: true, message: 'Odeme daha once tamamlanmis.' });
            }
            if (reservation.status !== 'pending_payment') {
                await rollbackTransaction(connection);
                return res.status(409).json({ success: false, message: 'Bu rezervasyon odeme kabul etmiyor.' });
            }

            releaseSlot = await acquireSlotLock(connection, reservation);
            const [activeRes] = await connection.query(
                `SELECT id FROM reservations
                 WHERE fieldKey = ? AND pitchNumber = ? AND (play_date = ? OR dateText = ?) AND hourText = ? AND status = 'active' AND id != ?`,
                [reservation.fieldKey, reservation.pitchNumber, reservation.play_date, reservation.dateText, reservation.hourText, reservationId]
            );
            if (activeRes.length > 0) {
                await rollbackTransaction(connection);
                return res.status(409).json({ success: false, message: 'Bu saat dilimi baska bir kullanici tarafindan rezerve edilmis.' });
            }

            await connection.query(
                'UPDATE reservations SET payment_status = "odendi", payment_method = "online", status = "active" WHERE id = ?',
                [reservationId]
            );
            await enqueueTelegramNotification(connection, reservationId, 'paid', { payment_type: 'single' });
            await commitTransaction(connection);
            res.json({ success: true, message: 'Odeme basarili!' });
        } catch (error) {
            await rollbackTransaction(connection).catch(() => {});
            console.error('Pay single error:', error);
            res.status(500).json({ success: false, message: 'Odeme islemi basarisiz oldu.' });
        } finally {
            await releaseSlot();
            connection.release();
        }
    });
}

module.exports = { initPaymentRoutes, checkAndCancelExpiredPayments };
