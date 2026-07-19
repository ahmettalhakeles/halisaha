const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveAuthHeaders } = require('../public/js/auth-context');

test('normal business login prefers the business token over a stale admin token', () => {
    const headers = resolveAuthHeaders({
        isBusinessPage: true,
        isAdminPage: false,
        adminToken: 'stale-admin-token',
        businessToken: 'current-business-token',
        userToken: null,
        impersonateField: null
    });

    assert.deepEqual(headers, { Authorization: 'Bearer current-business-token' });
});

test('admin impersonation continues to use the admin token', () => {
    const headers = resolveAuthHeaders({
        isBusinessPage: true,
        isAdminPage: false,
        adminToken: 'current-admin-token',
        businessToken: 'business-token',
        userToken: null,
        impersonateField: '{"key":"ciragan"}'
    });

    assert.deepEqual(headers, { 'x-admin-token': 'current-admin-token' });
});

test('admin and user pages retain their existing token behavior', () => {
    assert.deepEqual(resolveAuthHeaders({
        isBusinessPage: false,
        isAdminPage: true,
        adminToken: 'admin-token',
        businessToken: null,
        userToken: null,
        impersonateField: null
    }), { 'x-admin-token': 'admin-token' });

    assert.deepEqual(resolveAuthHeaders({
        isBusinessPage: false,
        isAdminPage: false,
        adminToken: null,
        businessToken: null,
        userToken: 'user-token',
        impersonateField: null
    }), { Authorization: 'Bearer user-token' });
});
