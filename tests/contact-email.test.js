const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SUPPORT_EMAIL = 'ksk.yardım@gmail.com';
const OLD_SUPPORT_EMAIL = 'kskdestek@gmail.com';

const files = [
    'public/index.html',
    'public/privacy.html',
    'RAILWAY_VARS.md',
    'MIMARI_DOKUMAN.md'
];

test('public support and sender documentation use the current KSK email', () => {
    for (const file of files) {
        const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
        assert.doesNotMatch(content, new RegExp(OLD_SUPPORT_EMAIL.replace('.', '\\.')));
        assert.match(content, new RegExp(SUPPORT_EMAIL.replace('.', '\\.')));
    }
});
