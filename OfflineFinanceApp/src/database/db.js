import SQLite from 'react-native-sqlite-storage';
import {DATABASE_NAME} from '../utils/constants';

SQLite.enablePromise(true);

let database = null;

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

  return db;
};
