const test = require('node:test');
const assert = require('node:assert/strict');
const { initAuthRoutes } = require('../server/routes/auth');

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

function createRegisterHandlers(db) {
    let handlers;
    const app = {
        get() {},
        put() {},
        post(path, ...routeHandlers) {
            if (path === '/api/register') handlers = routeHandlers;
        }
    };
    initAuthRoutes(app, db);
    return handlers;
}

test('register rejects an existing email before insert and normalizes case', async () => {
    const queries = [];
    const db = {
        execute(sql, params, cb) {
            queries.push({ sql, params });
            if (sql.startsWith('SELECT COUNT(DISTINCT fieldKey)')) {
                return cb(null, [{ count: 0 }]);
            }
            if (sql.startsWith('SELECT id, phone, email FROM users')) {
                assert.equal(params[1], 'berk@example.com');
                return cb(null, [{ id: 7, phone: '05000000000', email: 'berk@example.com' }]);
            }
            throw new Error('insert should not be reached');
        }
    };
    const handlers = createRegisterHandlers(db);
    const response = createResponse();

    await runHandlers(handlers, {
        ip: '127.0.0.1',
        headers: {},
        app: { get: () => false },
        body: {
            firstName: 'Berk',
            lastName: 'Ceyhan',
            phone: '05664477889',
            email: '  BERK@example.com  ',
            password: '123456'
        }
    }, response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /e-posta/);
    assert.equal(queries.some(q => q.sql.startsWith('INSERT INTO users')), false);
});
