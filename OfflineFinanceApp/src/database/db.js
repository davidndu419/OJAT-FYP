import SQLite from 'react-native-sqlite-storage';
import {format} from 'date-fns';
import {DATABASE_NAME} from '../utils/constants';
import {generateId, getCurrentTimestamp} from '../utils/helpers';

SQLite.enablePromise(true);

let database = null;

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const addColumnIfMissing = async (db, tableName, columnDefinition) => {
  try {
    await db.executeSql(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`,
    );
  } catch (error) {
    const message = String(error?.message || error);

    if (!message.toLowerCase().includes('duplicate column')) {
      throw error;
    }
  }
};

export const getDBConnection = async () => {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabase({
    name: DATABASE_NAME,
    location: 'default',
  });

  return database;
};

export const initDatabase = async () => {
  const db = await getDBConnection();

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      cost_price REAL,
      selling_price REAL,
      quantity INTEGER,
      min_threshold INTEGER,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      quantity INTEGER,
      total REAL,
      date TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  await addColumnIfMissing(
    db,
    'sales',
    "payment_method TEXT NOT NULL DEFAULT 'cash'",
  );

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT,
      description TEXT,
      amount REAL,
      date TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      service_type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS service_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  await addColumnIfMissing(db, 'service_types', 'updated_at TEXT');
  await addColumnIfMissing(
    db,
    'service_types',
    'synced INTEGER DEFAULT 0',
  );

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS daily_balance (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE,
      sales_cash REAL DEFAULT 0,
      sales_bank REAL DEFAULT 0,
      services_cash REAL DEFAULT 0,
      services_bank REAL DEFAULT 0,
      last_reset TEXT
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.executeSql(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);',
    ['balance_display', 'separate'],
  );
  await db.executeSql(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);',
    ['expense_allocation', 'combined'],
  );
  await db.executeSql(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);',
    ['sales_expense_percent', '60'],
  );
  await db.executeSql(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);',
    ['services_expense_percent', '40'],
  );

  await resetBalanceIfNewDay();

  return db;
};

export const getTodayBalance = async () => {
  const db = await getDBConnection();
  const today = getTodayKey();
  const now = getCurrentTimestamp();

  await db.executeSql(
    `INSERT OR IGNORE INTO daily_balance (
       id,
       date,
       sales_cash,
       sales_bank,
       services_cash,
       services_bank,
       last_reset
     ) VALUES (?, ?, 0, 0, 0, 0, ?);`,
    [generateId(), today, now],
  );

  const [result] = await db.executeSql(
    'SELECT * FROM daily_balance WHERE date = ? LIMIT 1;',
    [today],
  );

  return result.rows.length > 0 ? result.rows.item(0) : null;
};

export const updateDailyBalance = async (type, method, amount) => {
  const normalizedType = type === 'services' ? 'services' : 'sales';
  const normalizedMethod = method === 'bank' ? 'bank' : 'cash';
  const columnName = `${normalizedType}_${normalizedMethod}`;
  const numericAmount = Number(amount || 0);

  if (numericAmount <= 0) {
    return getTodayBalance();
  }

  const db = await getDBConnection();
  await getTodayBalance();

  await db.executeSql(
    `UPDATE daily_balance
     SET ${columnName} = COALESCE(${columnName}, 0) + ?
     WHERE date = ?;`,
    [numericAmount, getTodayKey()],
  );

  return getTodayBalance();
};

export const resetBalanceIfNewDay = async () => {
  const db = await getDBConnection();
  const today = getTodayKey();
  const [latestResult] = await db.executeSql(
    'SELECT date FROM daily_balance ORDER BY date DESC LIMIT 1;',
  );

  if (
    latestResult.rows.length === 0 ||
    String(latestResult.rows.item(0).date || '') < today
  ) {
    return getTodayBalance();
  }

  return getTodayBalance();
};

export const getSetting = async key => {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    'SELECT value FROM settings WHERE key = ? LIMIT 1;',
    [key],
  );

  return result.rows.length > 0 ? result.rows.item(0).value : null;
};

export const setSetting = async (key, value) => {
  const db = await getDBConnection();

  await db.executeSql(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
    [key, String(value)],
  );

  return String(value);
};
