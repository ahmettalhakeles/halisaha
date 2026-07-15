const crypto = require('crypto');

function slotLockKey(reservation) {
    let date = reservation.play_date || reservation.dateText;
    if (date instanceof Date) {
        date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
        date = date.slice(0, 10);
    }
    const slot = [reservation.fieldKey, Number(reservation.pitchNumber), date, reservation.hourText].join('|');
    return `slot:${crypto.createHash('sha256').update(slot).digest('hex').slice(0, 48)}`;
}

async function acquireSlotLock(connection, reservation, timeoutSeconds = 5) {
    const key = slotLockKey(reservation);
    const [rows] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [key, timeoutSeconds]);
    if (Number(rows[0]?.acquired) !== 1) {
        const error = new Error('Rezervasyon saati şu anda başka bir işlem tarafından güncelleniyor.');
        error.code = 'SLOT_LOCK_TIMEOUT';
        throw error;
    }
    return async () => {
        await connection.query('SELECT RELEASE_LOCK(?)', [key]).catch(() => {});
    };
}

module.exports = { slotLockKey, acquireSlotLock };
