import AsyncStorage from '@react-native-async-storage/async-storage';
import {getDBConnection} from '../database/db';
import {getRowsArray} from '../utils/helpers';
import {
  getExpenses,
  getProducts,
  getSales,
  postExpense,
  postProduct,
  postSale,
} from './apiService';

export const LAST_SUCCESSFUL_SYNC_KEY = 'last_successful_sync_at';

const SYNC_TABLES = ['products', 'sales', 'expenses'];

const TABLE_CONFIG = {
  products: {
    post: postProduct,
    get: getProducts,
    responseKey: 'products',
    columns: [
      'id',
      'name',
      'category',
      'cost_price',
      'selling_price',
      'quantity',
      'min_threshold',
      'updated_at',
      'synced',
    ],
    updateColumns: [
      'name',
      'category',
      'cost_price',
      'selling_price',
      'quantity',
      'min_threshold',
      'updated_at',
    ],
  },
  sales: {
    post: postSale,
    get: getSales,
    responseKey: 'sales',
    columns: ['id', 'product_id', 'quantity', 'total', 'date', 'synced'],
    updateColumns: ['product_id', 'quantity', 'total', 'date'],
  },
  expenses: {
    post: postExpense,
    get: getExpenses,
    responseKey: 'expenses',
    columns: ['id', 'category', 'description', 'amount', 'date', 'synced'],
    updateColumns: ['category', 'description', 'amount', 'date'],
  },
};

const addError = (errors, scope, error) => {
  const message =
    error?.response?.data?.message || error?.message || String(error);
  const entry = `${scope}: ${message}`;
  console.error(entry, error);
  errors.push(entry);
};

const normalizeRecords = (response, responseKey) => {
  const payload = response?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.[responseKey])) {
    return payload[responseKey];
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.[responseKey])) {
    return payload.data[responseKey];
  }

  return [];
};

const getComparableTimestamp = record => {
  const value = record?.updated_at || record?.date || record?.created_at;
  const timestamp = value ? new Date(value).getTime() : 0;

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getUnsyncedRows = async (db, tableName) => {
  const [result] = await db.executeSql(
    `SELECT * FROM ${tableName} WHERE synced = 0`,
  );

  return getRowsArray(result);
};

const markRowAsSynced = async (db, tableName, id) => {
  await db.executeSql(`UPDATE ${tableName} SET synced = 1 WHERE id = ?`, [id]);
};

const getLocalRecord = async (db, tableName, id) => {
  const [result] = await db.executeSql(
    `SELECT * FROM ${tableName} WHERE id = ?`,
    [id],
  );

  return result.rows.length > 0 ? result.rows.item(0) : null;
};

const getColumnValue = (record, column) => {
  if (column === 'synced') {
    return 1;
  }

  if (column === 'date') {
    return record?.date || record?.updated_at || record?.created_at || null;
  }

  if (column === 'updated_at') {
    return record?.updated_at || record?.date || record?.created_at || null;
  }

  return record?.[column] ?? null;
};

const buildValues = (record, columns) =>
  columns.map(column => {
    return getColumnValue(record, column);
  });

const insertRecord = async (db, tableName, columns, record) => {
  const placeholders = columns.map(() => '?').join(', ');
  const values = buildValues(record, columns);

  await db.executeSql(
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
    values,
  );
};

const updateRecord = async (db, tableName, columns, record) => {
  const assignments = columns.map(column => `${column} = ?`).join(', ');
  const values = columns.map(column => getColumnValue(record, column));

  await db.executeSql(
    `UPDATE ${tableName} SET ${assignments}, synced = 1 WHERE id = ?`,
    [...values, record.id],
  );
};

const syncUnsyncedTable = async (db, tableName, errors) => {
  const config = TABLE_CONFIG[tableName];
  const rows = await getUnsyncedRows(db, tableName);
  let synced = 0;

  for (const row of rows) {
    try {
      await config.post(row);
      await markRowAsSynced(db, tableName, row.id);
      synced += 1;
    } catch (error) {
      addError(errors, `Sync ${tableName} record ${row.id}`, error);
    }
  }

  return synced;
};

const pullTableFromServer = async (db, tableName, errors) => {
  const config = TABLE_CONFIG[tableName];
  let synced = 0;

  try {
    const response = await config.get();
    const serverRecords = normalizeRecords(response, config.responseKey);

    for (const serverRecord of serverRecords) {
      if (!serverRecord?.id) {
        continue;
      }

      try {
        const localRecord = await getLocalRecord(
          db,
          tableName,
          serverRecord.id,
        );

        if (!localRecord) {
          await insertRecord(db, tableName, config.columns, serverRecord);
          synced += 1;
          continue;
        }

        const serverTimestamp = getComparableTimestamp(serverRecord);
        const localTimestamp = getComparableTimestamp(localRecord);

        if (serverTimestamp > localTimestamp) {
          await updateRecord(db, tableName, config.updateColumns, serverRecord);
          synced += 1;
        }
      } catch (error) {
        addError(errors, `Pull ${tableName} record ${serverRecord.id}`, error);
      }
    }
  } catch (error) {
    addError(errors, `Pull ${tableName}`, error);
  }

  return synced;
};

export const getPendingSyncCounts = async () => {
  const db = await getDBConnection();
  const counts = {};

  for (const tableName of SYNC_TABLES) {
    const [result] = await db.executeSql(
      `SELECT COUNT(*) AS count FROM ${tableName} WHERE synced = 0`,
    );
    counts[tableName] = result.rows.item(0).count;
  }

  return counts;
};

export const syncToServer = async () => {
  const result = {
    success: false,
    synced: 0,
    errors: [],
  };

  try {
    const db = await getDBConnection();

    result.synced += await syncUnsyncedTable(db, 'products', result.errors);
    result.synced += await syncUnsyncedTable(db, 'sales', result.errors);
    result.synced += await syncUnsyncedTable(db, 'expenses', result.errors);

    result.synced += await pullTableFromServer(db, 'products', result.errors);
    result.synced += await pullTableFromServer(db, 'sales', result.errors);
    result.synced += await pullTableFromServer(db, 'expenses', result.errors);

    result.success = result.errors.length === 0;

    if (result.success) {
      await AsyncStorage.setItem(
        LAST_SUCCESSFUL_SYNC_KEY,
        new Date().toISOString(),
      );
    }
  } catch (error) {
    addError(result.errors, 'Sync service', error);
  }

  return result;
};

export const syncPendingData = syncToServer;
