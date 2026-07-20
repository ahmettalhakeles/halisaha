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

function createBusinessRouteHandlers(db, routePath) {
    let handlers;
    const app = {
        post() {},
        put() {},
        delete() {},
        get(path, ...routeHandlers) {
            if (path === routePath) handlers = routeHandlers;
        }
    };
    initBusinessRoutes(app, db);
    return handlers;
}

function businessAuthHeader(fieldKey) {
    const token = jwt.sign({ role: 'business', fieldKey }, process.env.JWT_SECRET);
    return { authorization: `Bearer ${token}` };
}

function formatYmd(offsetDays = 0) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

test('business debts rejects requests without authentication', async () => {
    let queried = false;
    const handlers = createBusinessRouteHandlers({
        query() {
            queried = true;
            throw new Error('database should not be queried');
        }
    }, '/api/business-debts/:fieldKey');
    const response = createResponse();

    await runHandlers(handlers, {
        params: { fieldKey: 'final' },
        query: { filter: 'all' },
        headers: {}
    }, response);

    assert.equal(response.statusCode, 401);
    assert.equal(queried, false);
});

test('weekly schedule rejects another business field', async () => {
    let queried = false;
    const handlers = createBusinessRouteHandlers({
        query() {
            queried = true;
            throw new Error('database should not be queried');
        }
    }, '/api/weekly-schedule/:fieldKey');
    const response = createResponse();

    await runHandlers(handlers, {
        params: { fieldKey: 'final' },
        query: { weekStart: formatYmd(0), weekEnd: formatYmd(6) },
        headers: businessAuthHeader('arena')
    }, response);

    assert.equal(response.statusCode, 403);
    assert.equal(queried, false);
});

test('stats content includes paid manual cash totals', async () => {
    const today = formatYmd(0);
    const handlers = createStatsHandlers({
        query(sql, params, cb) {
            assert.equal(params[0], 'final');
            cb(null, [{
                status: 'active',
                type: 'manual',
                payment_method: 'cash',
                pitchNumber: 1,
                hourText: '20:00 - 21:00',
                created_at: new Date(),
                dateText: today,
                play_date: today,
                reservation_price: 1200,
                payment_status: 'odendi',
                morningPrice: 1000,
                eveningPrice: 1500
            }, {
                status: 'active',
                type: 'manual',
                payment_method: 'cash',
                pitchNumber: 1,
                hourText: '21:00 - 22:00',
                created_at: new Date(),
                dateText: today,
                play_date: today,
                reservation_price: 800,
                payment_status: 'odenmedi',
                morningPrice: 1000,
                eveningPrice: 1500
            }]);
        }
    });
    const response = createResponse();

    await runHandlers(handlers, {
        params: { fieldKey: 'final' },
        headers: businessAuthHeader('final')
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.cashToday, 1200);
    assert.equal(response.body.data.cashLast7Days, 1200);
    assert.equal(response.body.data.cashThisMonth, 1200);
    assert.equal(response.body.data.cashTotal, 1200);
    assert.equal(response.body.data.cashTodayUnpaid, 800);
    assert.equal(response.body.data.paymentStats.cash.totalPaid, 1200);
    assert.equal(response.body.data.paymentStats.cash.totalUnpaid, 800);
    assert.equal(response.body.data.paymentStats.combined.totalUnpaid, 800);
});
