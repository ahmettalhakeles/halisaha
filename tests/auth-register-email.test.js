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

function createAppForRoutes() {
    const routes = new Map();
    const app = {
        get() {},
        put(path, ...routeHandlers) {
            routes.set(`PUT ${path}`, routeHandlers);
        },
        post(path, ...routeHandlers) {
            routes.set(`POST ${path}`, routeHandlers);
        }
    };
    return { app, routes };
}

function createDb(connection) {
    return {
        promise() {
            return {
                getConnection: async () => connection,
                query: async (...args) => connection.query(...args)
            };
        },
        execute() {}
    };
}

function createRequest(body) {
    return {
        ip: '127.0.0.1',
        protocol: 'http',
        headers: {},
        app: { get: () => false },
        get: () => 'localhost:5000',
        body
    };
}

async function withEnv(key, value, fn) {
    const previous = process.env[key];
    process.env[key] = value;
    try {
        await fn();
    } finally {
        if (previous === undefined) delete process.env[key];
        else process.env[key] = previous;
    }
}

test('register rejects an existing email before insert and normalizes case', async () => {
    const queries = [];
    const connection = {
        async query(sql, params) {
            queries.push({ sql, params });
            if (sql.startsWith('SELECT COUNT(DISTINCT fieldKey)')) return [[{ count: 0 }]];
            if (sql.startsWith('SELECT id, is_email_verified FROM users WHERE email')) {
                assert.deepEqual(params, ['berk@example.com']);
                return [[{ id: 7, is_email_verified: 1 }]];
            }
            throw new Error('insert should not be reached');
        },
        release() {}
    };
    const { app, routes } = createAppForRoutes();
    initAuthRoutes(app, createDb(connection));
    const response = createResponse();

    await runHandlers(routes.get('POST /api/register'), createRequest({
        firstName: 'Berk',
        lastName: 'Ceyhan',
        phone: '05664477889',
        email: '  BERK@example.com  ',
        password: '123456'
    }), response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /e-posta/);
    assert.equal(queries.some(q => q.sql.startsWith('INSERT INTO users')), false);
});

test('register resends verification for an existing unverified email', async () => {
    await withEnv('EMAIL_VERIFICATION_REQUIRED', 'true', async () => {
        let sent = false;
        const queries = [];
        const connection = {
            async query(sql, params) {
                queries.push({ sql, params });
                if (sql.startsWith('SELECT COUNT(DISTINCT fieldKey)')) return [[{ count: 0 }]];
                if (sql.startsWith('SELECT id, is_email_verified FROM users WHERE email')) {
                    return [[{ id: 7, is_email_verified: 0 }]];
                }
                if (sql.startsWith('REPLACE INTO email_verification_tokens')) {
                    assert.equal(params[0], 7);
                    return [{}];
                }
                throw new Error(`unexpected query: ${sql}`);
            },
            release() {}
        };
        const { app, routes } = createAppForRoutes();
        initAuthRoutes(app, createDb(connection), {
            mailer: async ({ to }) => {
                assert.equal(to, 'berk@example.com');
                sent = true;
            }
        });
        const response = createResponse();

        await runHandlers(routes.get('POST /api/register'), createRequest({
            firstName: 'Berk',
            lastName: 'Ceyhan',
            phone: '05664477889',
            email: 'berk@example.com',
            password: '123456'
        }), response);

        assert.equal(response.statusCode, 202);
        assert.equal(response.body.success, true);
        assert.equal(response.body.requiresEmailVerification, true);
        assert.equal(response.body.emailSent, true);
        assert.equal(sent, true);
        assert.equal(queries.some(q => q.sql.startsWith('INSERT INTO users')), false);
    });
});

test('register rejects duplicate phone when email is unique', async () => {
    const queries = [];
    const connection = {
        async query(sql, params) {
            queries.push({ sql, params });
            if (sql.startsWith('SELECT COUNT(DISTINCT fieldKey)')) return [[{ count: 0 }]];
            if (sql.startsWith('SELECT id, is_email_verified FROM users WHERE email')) return [[]];
            if (sql.startsWith('SELECT id FROM users WHERE phone = ?')) {
                assert.deepEqual(params, ['05000000000']);
                return [[{ id: 3 }]];
            }
            throw new Error(`unexpected query: ${sql}`);
        },
        release() {}
    };
    const { app, routes } = createAppForRoutes();
    initAuthRoutes(app, createDb(connection));
    const response = createResponse();

    await runHandlers(routes.get('POST /api/register'), createRequest({
        firstName: 'Berk',
        lastName: 'Ceyhan',
        phone: '05000000000',
        email: 'new@example.com',
        password: '123456'
    }), response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, 'PHONE_IN_USE');
    assert.match(response.body.message, /telefon/);
    assert.equal(queries.some(q => q.sql.startsWith('INSERT INTO users')), false);
});

test('google auth endpoint stays hidden until feature flag is enabled', async () => {
    const { app, routes } = createAppForRoutes();
    initAuthRoutes(app, createDb({ query() {}, release() {} }));
    const response = createResponse();

    await runHandlers(routes.get('POST /api/auth/google'), createRequest({ credential: 'token' }), response);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
});
