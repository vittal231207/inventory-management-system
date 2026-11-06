const mysql = require('mysql2/promise')

const databaseUrl = new URL(process.env.DATABASE_URL || 'mysql://stockroom:stockroom@127.0.0.1:3306/stockroom')
const pool = mysql.createPool({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.slice(1),
  timezone: 'Z',
  dateStrings: ['DATE'],
  waitForConnections: true,
  connectionLimit: 10,
})
module.exports = { pool }
