const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'database_complete.sql'), 'utf8');
const initDbJs = fs.readFileSync(path.join(__dirname, '..', 'server', 'initDb.js'), 'utf8');

test('users email is unique in base schema and startup migration', () => {
    assert.match(schemaSql, /UNIQUE KEY unique_email \(email\)/);
    assert.doesNotMatch(schemaSql, /UNIQUE KEY unique_phone \(phone\)/);
    assert.match(schemaSql, /password VARCHAR\(255\) DEFAULT NULL/);
    assert.match(schemaSql, /is_email_verified TINYINT(?:\(1\))? NOT NULL DEFAULT 0/);
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS user_auth_identities/);
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS email_verification_tokens/);
    assert.match(initDbJs, /normalizeAndUniquifyUserEmails\(connection\)/);
    assert.match(initDbJs, /dropUniquePhoneIndex\(connection\)/);
    assert.match(initDbJs, /removeLegacySplitPaymentTables\(connection\)/);
    assert.match(initDbJs, /ALTER TABLE users ADD UNIQUE KEY unique_email \(email\)/);
    assert.match(initDbJs, /SHOW INDEX FROM users WHERE Key_name = 'unique_email'/);
});
