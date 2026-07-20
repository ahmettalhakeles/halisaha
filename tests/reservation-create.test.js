const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { initReservationRoutes } = require('../server/routes/reservations');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

function formatYmd(offsetDays = 0) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function createReservationHandler(connection) {
    let handler;
    const app = {
        get() {},
        put() {},
        delete() {},
        post(path, ...handlers) {
            if (path === '/api/reservations') handler = handlers.at(-1);
        }
    };
    const db = { promise: () => ({ getConnection: async () => connection }) };

    initReservationRoutes(app, db);
    return handler;
}

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

function validRequest() {
    return {
        body: {
            fieldKey: 'final',
            pitchNumber: 1,
            play_date: formatYmd(3),
            hourText: '21:00 - 22:00',
            user_name: 'TEST USER',
            user_id: 7,
            reservation_price: 2800
        }
    };
}

async function runHandlers(handlers, req, res) {
    for (const handler of handlers) {
        let nextCalled = false;
        await handler(req, res, () => {
            nextCalled = true;
        });
        if (!nextCalled) break;
    }
}

function createUpdateHandlers(connection) {
    let handlers;
    const app = {
        get() {},
        post() {},
        delete() {},
        put(path, ...routeHandlers) {
            if (path === '/api/reservations/:id') handlers = routeHandlers;
        }
    };
    const db = { promise: () => ({ getConnection: async () => connection }) };

    initReservationRoutes(app, db);
    return handlers;
}

function businessAuthHeader(fieldKey = 'final') {
    const token = jwt.sign({ role: 'business', fieldKey }, process.env.JWT_SECRET);
    return { authorization: `Bearer ${token}` };
}

test('reservation creation uses current user schema and commits an available slot', async () => {
    const queries = [];
    let insertedUserId;
    const connection = {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async query(sql, params = []) {
            queries.push(sql);
            if (sql.startsWith('SELECT id, phone, status FROM users')) {
                return [[{ id: 7, phone: '05051234567', status: 'active' }]];
            }
            if (sql.startsWith('SELECT COUNT(*) AS cnt FROM field_blacklists')) return [[{ cnt: 0 }]];
            if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }]];
            if (sql.startsWith('SELECT id, status, type FROM reservations')) return [[]];
            if (sql.startsWith('INSERT INTO reservations')) {
                insertedUserId = params[6];
                return [{ insertId: 42 }];
            }
            if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    const response = createResponse();

    await createReservationHandler(connection)(validRequest(), response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
        success: true,
        message: 'Rezervasyon başarıyla oluşturuldu!',
        id: 42
    });
    assert.ok(queries.some(sql => sql.startsWith('SELECT id, phone, status FROM users')));
    assert.ok(queries.every(sql => !sql.includes('SELECT id, name, phone, status FROM users')));
    assert.equal(insertedUserId, 7);
});

test('reservation creation rejects an unknown user before locking or inserting', async () => {
    const queries = [];
    let rolledBack = false;
    const connection = {
        async beginTransaction() {},
        async commit() {},
        async rollback() { rolledBack = true; },
        release() {},
        async query(sql) {
            queries.push(sql);
            if (sql.startsWith('SELECT id, phone, status FROM users')) return [[]];
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    const response = createResponse();

    await createReservationHandler(connection)(validRequest(), response);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(rolledBack, true);
    assert.equal(queries.some(sql => sql.startsWith('SELECT GET_LOCK')), false);
    assert.equal(queries.some(sql => sql.startsWith('INSERT INTO reservations')), false);
});

test('reservation creation rejects a missing user id as a bad request', async () => {
    const request = validRequest();
    delete request.body.user_id;
    let requestedConnection = false;
    const app = {
        get() {},
        put() {},
        delete() {},
        post(path, ...handlers) {
            if (path === '/api/reservations') this.handler = handlers.at(-1);
        }
    };
    const db = {
        promise: () => ({
            getConnection: async () => {
                requestedConnection = true;
                throw new Error('connection should not be requested');
            }
        })
    };
    initReservationRoutes(app, db);
    const response = createResponse();

    await app.handler(request, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(requestedConnection, false);
});

test('reservation creation preserves the occupied-slot conflict response', async () => {
    let inserted = false;
    let rolledBack = false;
    const connection = {
        async beginTransaction() {},
        async commit() {},
        async rollback() { rolledBack = true; },
        release() {},
        async query(sql) {
            if (sql.startsWith('SELECT id, phone, status FROM users')) {
                return [[{ id: 7, phone: '05051234567', status: 'active' }]];
            }
            if (sql.startsWith('SELECT COUNT(*) AS cnt FROM field_blacklists')) return [[{ cnt: 0 }]];
            if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }]];
            if (sql.startsWith('SELECT id, status, type FROM reservations')) {
                return [[{ id: 11, status: 'active', type: 'normal' }]];
            }
            if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
            if (sql.startsWith('INSERT INTO reservations')) inserted = true;
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    const response = createResponse();

    await createReservationHandler(connection)(validRequest(), response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.success, false);
    assert.equal(rolledBack, true);
    assert.equal(inserted, false);
});

test('reservation update rejects requests without authentication', async () => {
    let requestedConnection = false;
    const connection = {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async query() {
            requestedConnection = true;
            throw new Error('connection should not be used');
        }
    };
    const response = createResponse();
    const handlers = createUpdateHandlers(connection);

    await runHandlers(handlers, {
        params: { id: '5' },
        headers: {},
        body: { dateText: formatYmd(2), hourText: '20:00 - 21:00' }
    }, response);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(requestedConnection, false);
});

test('reservation update rejects another business field', async () => {
    let rolledBack = false;
    const connection = {
        async beginTransaction() {},
        async commit() {},
        async rollback() { rolledBack = true; },
        release() {},
        async query(sql) {
            if (sql.startsWith('SELECT * FROM reservations')) {
                return [[{
                    id: 5,
                    fieldKey: 'final',
                    pitchNumber: 1,
                    play_date: formatYmd(1),
                    hourText: '19:00 - 20:00',
                    user_id: 7,
                    status: 'active'
                }]];
            }
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    const response = createResponse();
    const handlers = createUpdateHandlers(connection);

    await runHandlers(handlers, {
        params: { id: '5' },
        headers: businessAuthHeader('other-field'),
        body: { dateText: formatYmd(2), hourText: '20:00 - 21:00' }
    }, response);

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(rolledBack, true);
});

test('reservation update rejects dates beyond 30 days', async () => {
    let requestedConnection = false;
    const connection = {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async query() {
            requestedConnection = true;
            throw new Error('connection should not be used');
        }
    };
    const response = createResponse();
    const handlers = createUpdateHandlers(connection);

    await runHandlers(handlers, {
        params: { id: '5' },
        headers: businessAuthHeader(),
        body: { dateText: formatYmd(31), hourText: '20:00 - 21:00' }
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(requestedConnection, false);
});

test('reservation update rejects an occupied target slot', async () => {
    let rolledBack = false;
    let updated = false;
    const connection = {
        async beginTransaction() {},
        async commit() {},
        async rollback() { rolledBack = true; },
        release() {},
        async query(sql) {
            if (sql.startsWith('SELECT * FROM reservations')) {
                return [[{
                    id: 5,
                    fieldKey: 'final',
                    pitchNumber: 1,
                    play_date: formatYmd(1),
                    hourText: '19:00 - 20:00',
                    user_id: 7,
                    status: 'active'
                }]];
            }
            if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }]];
            if (sql.startsWith('SELECT id, status, type FROM reservations')) {
                return [[{ id: 9, status: 'active', type: 'normal' }]];
            }
            if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
            if (sql.startsWith('UPDATE reservations')) updated = true;
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    const response = createResponse();
    const handlers = createUpdateHandlers(connection);

    await runHandlers(handlers, {
        params: { id: '5' },
        headers: businessAuthHeader(),
        body: { dateText: formatYmd(2), hourText: '20:00 - 21:00' }
    }, response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.success, false);
    assert.equal(rolledBack, true);
    assert.equal(updated, false);
});

test('reservation update commits an authorized available slot change', async () => {
    let committed = false;
    let updateParams;
    const connection = {
        async beginTransaction() {},
        async commit() { committed = true; },
        async rollback() {},
        release() {},
        async query(sql, params = []) {
            if (sql.startsWith('SELECT * FROM reservations')) {
                return [[{
                    id: 5,
                    fieldKey: 'final',
                    pitchNumber: 1,
                    play_date: formatYmd(1),
                    hourText: '19:00 - 20:00',
                    user_id: 7,
                    status: 'active'
                }]];
            }
            if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }]];
            if (sql.startsWith('SELECT id, status, type FROM reservations')) return [[]];
            if (sql.startsWith('UPDATE reservations')) {
                updateParams = params;
                return [{ affectedRows: 1 }];
            }
            if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    const response = createResponse();
    const handlers = createUpdateHandlers(connection);
    const newDate = formatYmd(2);

    await runHandlers(handlers, {
        params: { id: '5' },
        headers: businessAuthHeader(),
        body: { dateText: newDate, hourText: '20:00 - 21:00', pitchNumber: 1 }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(committed, true);
    assert.deepEqual(updateParams, [newDate, newDate, '20:00 - 21:00', 1, '5']);
});
