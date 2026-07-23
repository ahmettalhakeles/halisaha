const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { initPaymentRoutes } = require('../server/routes/payment');

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

async function runHandlers(handlers, req, res) {
    for (const handler of handlers) {
        let nextCalled = false;
        await handler(req, res, () => {
            nextCalled = true;
        });
        if (!nextCalled) break;
    }
}

test('single payment is idempotent for an already paid reservation', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
    const queries = [];
    const connection = {
        async query(sql, params) {
            queries.push({ sql, params });
            if (sql === 'BEGIN') return [{}];
            if (sql === 'ROLLBACK') return [{}];
            if (sql.startsWith('SELECT * FROM reservations WHERE id = ?')) {
                return [[{
                    id: 42,
                    user_id: 7,
                    fieldKey: 'final',
                    status: 'active',
                    payment_status: 'odendi'
                }]];
            }
            throw new Error(`unexpected query: ${sql}`);
        },
        release() {}
    };
    const db = {
        promise() {
            return { getConnection: async () => connection };
        }
    };
    const routes = new Map();
    const app = {
        post(path, ...handlers) {
            routes.set(path, handlers);
        }
    };
    initPaymentRoutes(app, db);
    const token = jwt.sign({ id: 7 }, process.env.JWT_SECRET);
    const response = createResponse();

    await runHandlers(routes.get('/api/reservations/:id/payment/pay-single'), {
        params: { id: '42' },
        headers: { authorization: `Bearer ${token}` }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(queries.some(q => String(q.sql).startsWith('UPDATE reservations')), false);
    assert.equal(queries.some(q => String(q.sql).includes('GET_LOCK')), false);
});
