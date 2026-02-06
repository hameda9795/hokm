import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// مسیر فایل دیتابیس
const dbPath = path.join(process.cwd(), 'data', 'hokm.db');

// اطمینان از وجود پوشه data
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ایجاد اتصال به دیتابیس
const db: DatabaseType = new Database(dbPath);

// فعال کردن WAL mode برای عملکرد بهتر
db.pragma('journal_mode = WAL');

// ایجاد جدول گروه‌های مجاز
db.exec(`
  CREATE TABLE IF NOT EXISTS authorized_groups (
    chat_id INTEGER PRIMARY KEY,
    group_name TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    added_by TEXT NOT NULL,
    last_notified_at TEXT
  )
`);

console.log('✅ Database initialized at:', dbPath);

export default db;
