/**
 * MySQL transaction helper methods for race condition prevention.
 */
async function beginTransaction(connection) {
    await connection.query('BEGIN');
}

async function commitTransaction(connection) {
    await connection.query('COMMIT');
}

async function rollbackTransaction(connection) {
    await connection.query('ROLLBACK');
}

module.exports = {
    beginTransaction,
    commitTransaction,
    rollbackTransaction
};
