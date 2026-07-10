require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'halisaha_kiralama',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 30000,
    maxIdle: 5,
    idleTimeout: 60000,
    multipleStatements: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
});

module.exports = pool;
