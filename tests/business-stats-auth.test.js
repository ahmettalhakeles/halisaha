const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { initBusinessRoutes } = require('../server/routes/business');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

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

function createStatsHandlers(db) {
    let handlers;
    const app = {
        post() {},
        put() {},
        delete() {},
        get(path, ...routeHandlers) {
            if (path === '/api/stats-content/:fieldKey') handlers = routeHandlers;
        }
    };
    initBusinessRoutes(app, db);
    return handlers;
}

function businessAuthHeader(fieldKey) {
    const token = jwt.sign({ role: 'business', fieldKey }, process.env.JWT_SECRET);
    return { authorization: `Bearer ${token}` };
}

test('stats content rejects requests without authentication', async () => {
    let queried = false;
    const handlers = createStatsHandlers({
        query() {
            queried = true;
            throw new Error('database should not be queried');
        }
    });
    const response = createResponse();

    await runHandlers(handlers, {
        params: { fieldKey: 'final' },
        headers: {}
    }, response);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(queried, false);
});

test('stats content rejects another business field', async () => {
    let queried = false;
    const handlers = createStatsHandlers({
        query() {
            queried = true;
            throw new Error('database should not be queried');
        }
    });
    const response = createResponse();

    await runHandlers(handlers, {
        params: { fieldKey: 'final' },
        headers: businessAuthHeader('arena')
    }, response);

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(queried, false);
});
