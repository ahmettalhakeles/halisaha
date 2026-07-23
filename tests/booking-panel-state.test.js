const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'script.js'), 'utf8');

function extractFunction(name) {
    const start = scriptJs.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} should exist`);
    const bodyStart = scriptJs.indexOf('{', start);
    let depth = 0;
    for (let index = bodyStart; index < scriptJs.length; index += 1) {
        if (scriptJs[index] === '{') depth += 1;
        if (scriptJs[index] === '}') depth -= 1;
        if (depth === 0) return scriptJs.slice(start, index + 1);
    }
    throw new Error(`Could not extract ${name}`);
}

test('mobile booking panel is parked before a field rerender and restored after the selected card', () => {
    const operations = [];
    const panelClasses = new Set(['mobile-open']);
    const cardClasses = new Set();
    const panel = {
        style: { display: 'none' },
        classList: {
            add(value) { panelClasses.add(value); },
            remove(value) { panelClasses.delete(value); }
        }
    };
    const layout = {
        appendChild(element) {
            operations.push(['park', element]);
        }
    };
    const cardParent = {
        insertBefore(element, reference) {
            operations.push(['restore', element, reference]);
        }
    };
    const card = {
        nextSibling: { id: 'next-card' },
        parentNode: cardParent,
        classList: {
            add(value) { cardClasses.add(value); }
        }
    };
    const grid = { contains: element => element === panel };
    const elements = {
        fieldsGrid: grid,
        customerBookingGridLayout: layout,
        customerBookingPanel: panel,
        'card-final': card
    };
    const context = vm.createContext({
        currentSelectedFieldKey: 'final',
        isMobileViewport: () => true,
        document: { getElementById: id => elements[id] || null }
    });

    vm.runInContext(`${extractFunction('parkCustomerBookingPanel')}\n${extractFunction('restoreCustomerBookingPanel')}`, context);
    vm.runInContext('parkCustomerBookingPanel(); restoreCustomerBookingPanel();', context);

    assert.deepEqual(operations.map(operation => operation[0]), ['park', 'restore']);
    assert.equal(operations[0][1], panel);
    assert.equal(operations[1][1], panel);
    assert.equal(operations[1][2], card.nextSibling);
    assert.equal(cardClasses.has('active'), true);
    assert.equal(panelClasses.has('mobile-open'), true);
    assert.equal(panel.style.display, '');
});
