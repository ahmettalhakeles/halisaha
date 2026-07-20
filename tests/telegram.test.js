const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, buildMessage, callTelegram, enqueueTelegramNotification } = require('../server/utils/telegram');
const { slotLockKey } = require('../server/utils/slotLock');

test('escapeHtml escapes all Telegram HTML-sensitive characters', () => {
    assert.equal(escapeHtml(`<Ali & "Veli" '>`), '&lt;Ali &amp; &quot;Veli&quot; &#39;&gt;');
});

test('shared paid message states that both payments are complete', () => {
    const message = buildMessage('paid', {
        payment_type: 'shared', field_name: 'Arena', pitch_number: 1,
        date_text: '15 TEMMUZ', hour_text: '20:00 - 21:00', user_name: 'Ali',
        reservation_price: 3000
    });
    assert.match(message, /Ortak ödeme tamamlandı/);
    assert.match(message, /İki tarafın ödemesi tamamlandı/);
});

test('manual reservation messages keep the same title for paid and unpaid cash', () => {
    const unpaid = buildMessage('manual_created', {
        payment_type: 'manual_cash',
        payment_status: 'odenmedi',
        field_name: 'Çırağan',
        pitch_number: 1,
        play_date: '2026-07-23',
        hour_text: '19:00 - 20:00',
        user_name: 'Talha',
        reservation_price: 2800
    });
    const paid = buildMessage('manual_created', {
        payment_type: 'manual_cash',
        payment_status: 'odendi',
        field_name: 'Çırağan',
        pitch_number: 1,
        play_date: '2026-07-23',
        hour_text: '20:00 - 21:00',
        user_name: 'Talha',
        reservation_price: 2800
    });
    assert.match(unpaid, /Manuel rezervasyon yapıldı/);
    assert.match(paid, /Manuel rezervasyon yapıldı/);
    assert.doesNotMatch(paid, /Ödeme tamamlandı/);
    assert.match(unpaid, /ÖDENMEDİ \(Elden Nakit\)/);
    assert.match(paid, /ÖDENDİ \(Elden Nakit\)/);
    assert.match(paid, /23 TEMMUZ 2026/);
});

test('single online paid message uses online reservation title', () => {
    const message = buildMessage('paid', {
        payment_type: 'single',
        field_name: 'Arena',
        pitch_number: 1,
        play_date: '2026-07-21',
        hour_text: '19:00 - 20:00',
        user_name: 'Berk',
        reservation_price: 2800
    });
    assert.match(message, /Online rezervasyon yapıldı/);
    assert.doesNotMatch(message, /Ödeme tamamlandı/);
    assert.match(message, /ÖDENDİ \(Online\)/);
    assert.match(message, /21 TEMMUZ 2026/);
});

test('first_paid is not a supported notification event', () => {
    assert.throws(() => buildMessage('first_paid', {}), /Desteklenmeyen/);
});

test('enqueue uses INSERT IGNORE and event type as the idempotency boundary', async () => {
    const calls = [];
    const connection = {
        query: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.includes('FROM reservations')) {
                return [[{ id: 7, field_key: 'arena', telegram_chat_id: '123', user_name: 'Ali' }]];
            }
            return [{ affectedRows: 1 }];
        }
    };
    const inserted = await enqueueTelegramNotification(connection, 7, 'paid', { payment_type: 'shared' });
    assert.equal(inserted, true);
    assert.match(calls[1].sql, /INSERT IGNORE/);
    assert.deepEqual(calls[1].params.slice(0, 4), [7, 'arena', '123', 'paid']);
});

test('enqueue is a no-op when the business has no chat id', async () => {
    let insertCalled = false;
    const connection = {
        query: async sql => {
            if (sql.includes('FROM reservations')) return [[{ id: 9, field_key: 'arena', telegram_chat_id: null }]];
            insertCalled = true;
            return [{ affectedRows: 1 }];
        }
    };
    assert.equal(await enqueueTelegramNotification(connection, 9, 'paid'), false);
    assert.equal(insertCalled, false);
});

test('slot lock key is stable per field, pitch, date and hour', () => {
    const slot = { fieldKey: 'arena', pitchNumber: 1, play_date: '2026-07-20', hourText: '20:00 - 21:00' };
    assert.equal(slotLockKey(slot), slotLockKey({ ...slot }));
    assert.notEqual(slotLockKey(slot), slotLockKey({ ...slot, pitchNumber: 2 }));
    assert.equal(slotLockKey(slot), slotLockKey({ ...slot, play_date: new Date(2026, 6, 20) }));
});

test('callTelegram classifies 403 as permanent', async () => {
    const oldToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    const fakeFetch = async () => ({
        ok: false,
        status: 403,
        json: async () => ({ ok: false, description: 'Forbidden' })
    });
    try {
        await assert.rejects(
            () => callTelegram('123', 'test', {}, fakeFetch),
            error => error.status === 403 && error.retryable === false
        );
    } finally {
        if (oldToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
        else process.env.TELEGRAM_BOT_TOKEN = oldToken;
    }
});

test('callTelegram honors Telegram retry_after for 429', async () => {
    const oldToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    const fakeFetch = async () => ({
        ok: false,
        status: 429,
        json: async () => ({ ok: false, description: 'Too Many Requests', parameters: { retry_after: 12 } })
    });
    try {
        await assert.rejects(
            () => callTelegram('123', 'test', {}, fakeFetch),
            error => error.status === 429 && error.retryable === true && error.retryAfter === 12
        );
    } finally {
        if (oldToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
        else process.env.TELEGRAM_BOT_TOKEN = oldToken;
    }
});
