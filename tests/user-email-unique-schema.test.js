const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'database_complete.sql'), 'utf8');
const initDbJs = fs.readFileSync(path.join(__dirname, '..', 'server', 'initDb.js'), 'utf8');

test('users email is unique in base schema and startup migration', () => {
    assert.match(schemaSql, /UNIQUE KEY unique_email \(email\)/);
    assert.match(initDbJs, /normalizeAndUniquifyUserEmails\(connection\)/);
    assert.match(initDbJs, /ALTER TABLE users ADD UNIQUE KEY unique_email \(email\)/);
    assert.match(initDbJs, /SHOW INDEX FROM users WHERE Key_name = 'unique_email'/);
});
