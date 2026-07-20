const test = require('node:test');
const assert = require('node:assert/strict');
const { initReservationRoutes } = require('../server/routes/reservations');

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
            play_date: '2026-07-23',
            hourText: '21:00 - 22:00',
            user_name: 'TEST USER',
            user_id: 7,
            reservation_price: 2800
        }
    };
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
