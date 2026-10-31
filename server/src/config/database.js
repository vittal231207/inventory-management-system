const mysql = require('mysql2/promise')

const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://stockroom:stockroom@127.0.0.1:3306/stockroom')
module.exports = { pool }
