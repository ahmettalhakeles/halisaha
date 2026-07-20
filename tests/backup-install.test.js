const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const installer = fs.readFileSync(path.join(__dirname, '..', 'tools', 'backup', 'install-railway-mysql-backup.ps1'), 'utf8');

test('daily backup task sends success notifications', () => {
    assert.match(installer, /\$TaskName = 'Halisaha Railway MySQL Daily Full Backup'/);
    assert.match(installer, /New-ScheduledTaskTrigger -Daily -At '03:00'/);
    assert.match(installer, /New-ScheduledTaskAction[\s\S]*-SendSuccessNotification/);
});
