const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let pool;

if (DB_TYPE === 'mysql') {
  // MySQL Configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'realtime_chat',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  };

  pool = mysql.createPool(dbConfig);
} else {
  // SQLite Configuration
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../chat.db');
  
  class SQLitePool {
    constructor(dbPath) {
      this.dbPath = dbPath;
      this.db = null;
    }

    async getConnection() {
      if (!this.db) {
        this.db = new sqlite3.Database(this.dbPath);
      }
      return this.db;
    }

    async execute(sql, params = []) {
      return new Promise(async (resolve, reject) => {
        try {
          const db = await this.getConnection();
          
          // Convert MySQL syntax to SQLite
          sql = sql.replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT');
          sql = sql.replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP');
          sql = sql.replace(/ON UPDATE CURRENT_TIMESTAMP/g, '');
          sql = sql.replace(/ENUM\([^)]+\)/g, 'TEXT');
          sql = sql.replace(/BOOLEAN/g, 'INTEGER');
          sql = sql.replace(/TRUE/g, '1');
          sql = sql.replace(/FALSE/g, '0');
          
          console.log('Executing SQL:', sql, 'with params:', params);
          
          if (sql.trim().toUpperCase().startsWith('INSERT') || 
              sql.trim().toUpperCase().startsWith('UPDATE') || 
              sql.trim().toUpperCase().startsWith('DELETE')) {
            db.run(sql, params, function(err) {
              if (err) {
                console.error('SQLite error:', err);
                reject(err);
              } else {
                resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
              }
            });
          } else {
            db.all(sql, params, (err, rows) => {
              if (err) {
                console.error('SQLite error:', err);
                reject(err);
              } else {
                resolve([rows]);
              }
            });
          }
        } catch (error) {
          console.error('Database execute error:', error);
          reject(error);
        }
      });
    }
  }

  pool = new SQLitePool(dbPath);
}

// Test connection
const testConnection = async () => {
  try {
    if (DB_TYPE === 'mysql') {
      const connection = await pool.getConnection();
      console.log('✅ MySQL Database connected successfully');
      connection.release();
    } else {
      await pool.getConnection();
      console.log('✅ SQLite Database connected successfully');
    }
  } catch (error) {
    console.error(`❌ ${DB_TYPE.toUpperCase()} Database connection failed:`, error.message);
    
    if (DB_TYPE === 'mysql' && error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL server is not running. Try:');
      console.log('   1. Start MySQL server');
      console.log('   2. Or switch to SQLite by setting DB_TYPE=sqlite in .env');
      console.log('   3. Run: npm run migrate-sqlite');
    }
    
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection
};
