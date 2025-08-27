const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../chat.db');

// Create a promise-based wrapper for SQLite
class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          resolve(this.db);
        }
      });
    });
  }

  async execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Convert SQLite results to MySQL-like format
          resolve([rows]);
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ insertId: this.lastID, affectedRows: this.changes });
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Create singleton instance
const database = new Database();

// Connect on module load
database.connect().catch(console.error);

// Simulate MySQL pool interface
const pool = {
  async execute(sql, params = []) {
    // Convert MySQL syntax to SQLite
    sql = sql.replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT');
    sql = sql.replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    sql = sql.replace(/ON UPDATE CURRENT_TIMESTAMP/g, '');
    
    if (sql.includes('INSERT INTO')) {
      const result = await database.run(sql, params);
      return [result];
    } else {
      return await database.execute(sql, params);
    }
  }
};

const testConnection = async () => {
  try {
    await database.connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection
};
