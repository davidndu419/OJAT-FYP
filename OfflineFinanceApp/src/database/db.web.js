import {format} from 'date-fns';
import {generateId, getCurrentTimestamp} from '../utils/helpers';

const STORAGE_KEY = 'ojat_web_preview_db';

const createInitialState = () => ({
  products: [],
  sales: [],
  expenses: [],
  services: [],
  service_types: [],
  daily_balance: [],
  settings: [
    {key: 'balance_display', value: 'separate'},
    {key: 'expense_allocation', value: 'combined'},
    {key: 'sales_expense_percent', value: '60'},
    {key: 'services_expense_percent', value: '40'},
  ],
});

let state = null;

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const normalizeState = nextState => ({
  ...createInitialState(),
  ...nextState,
  settings:
    nextState?.settings?.length > 0
      ? mergeDefaultSettings(nextState.settings)
      : createInitialState().settings,
});

const mergeDefaultSettings = settings => {
  const defaults = createInitialState().settings;
  const existing = Array.isArray(settings) ? settings : [];

  return defaults.reduce(
    (acc, item) =>
      acc.some(setting => setting.key === item.key) ? acc : [...acc, item],
    existing,
  );
};

const loadState = () => {
  if (state) {
    return state;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    state = normalizeState(stored ? JSON.parse(stored) : createInitialState());
  } catch (error) {
    state = createInitialState();
  }

  return state;
};

const saveState = () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loadState()));
};

const createResult = rows => ({
  rows: {
    length: rows.length,
    item: index => rows[index],
    raw: () => rows,
  },
  rowsAffected: rows.length,
});

const between = (value, start, end) => value >= start && value <= end;

const sortBy = (rows, field, direction = 'ASC') => {
  const multiplier = direction === 'DESC' ? -1 : 1;

  return [...rows].sort(
    (left, right) =>
      String(left[field] || '').localeCompare(String(right[field] || '')) *
      multiplier,
  );
};

const sumBy = (rows, field) =>
  rows.reduce((total, row) => total + Number(row[field] || 0), 0);

const rowsInRange = (rows, params) => {
  const [start, end] = params;
  return rows.filter(row => between(row.date, start, end));
};

const countUnsynced = tableName =>
  loadState()[tableName].filter(row => Number(row.synced || 0) === 0).length;

const getProduct = productId =>
  loadState().products.find(product => product.id === productId);

const getTodayBalanceRow = () => {
  const dbState = loadState();
  const today = getTodayKey();
  let row = dbState.daily_balance.find(item => item.date === today);

  if (!row) {
    row = {
      id: generateId(),
      date: today,
      sales_cash: 0,
      sales_bank: 0,
      services_cash: 0,
      services_bank: 0,
      last_reset: getCurrentTimestamp(),
    };
    dbState.daily_balance.push(row);
    saveState();
  }

  return row;
};

const groupByDay = (rows, valueField) => {
  const grouped = rows.reduce((acc, row) => {
    const day = String(row.date).slice(0, 10);
    acc[day] = (acc[day] || 0) + Number(row[valueField] || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([day, total]) => ({day, total}))
    .sort((left, right) => left.day.localeCompare(right.day));
};

const executeSettingsSelect = params => {
  const setting = loadState().settings.find(item => item.key === params[0]);
  return createResult(setting ? [{value: setting.value}] : []);
};

const executeDailyBalanceSelect = normalizedSql => {
  const dbState = loadState();

  if (normalizedSql.includes('order by date desc')) {
    return createResult(
      sortBy(dbState.daily_balance, 'date', 'DESC').slice(0, 1),
    );
  }

  return createResult([getTodayBalanceRow()]);
};

const executeProductsSelect = (normalizedSql, params) => {
  const dbState = loadState();

  if (normalizedSql.includes('where coalesce(quantity')) {
    return createResult(
      sortBy(
        dbState.products.filter(
          product =>
            Number(product.quantity || 0) < Number(product.min_threshold || 0),
        ),
        'name',
      ),
    );
  }

  if (normalizedSql.includes('where id = ?')) {
    return createResult(
      dbState.products.filter(product => product.id === params[0]),
    );
  }

  return createResult(sortBy(dbState.products, 'name'));
};

const executeSalesSelect = (normalizedSql, params) => {
  const dbState = loadState();
  const rows = normalizedSql.includes('where')
    ? rowsInRange(dbState.sales, params)
    : dbState.sales;

  if (normalizedSql.includes('count(*) as count')) {
    return createResult([{count: countUnsynced('sales')}]);
  }

  if (normalizedSql.includes('sum(sales.total)')) {
    return createResult([
      rows.reduce(
        (acc, sale) => {
          const product = getProduct(sale.product_id);
          const method = sale.payment_method || 'cash';
          acc.revenue += Number(sale.total || 0);
          acc[method] += Number(sale.total || 0);
          acc.cogs +=
            Number(product?.cost_price || 0) * Number(sale.quantity || 0);
          return acc;
        },
        {revenue: 0, cash: 0, bank: 0, cogs: 0},
      ),
    ]);
  }

  if (normalizedSql.includes('sum(total)')) {
    if (normalizedSql.includes('group by substr')) {
      return createResult(groupByDay(rows, 'total'));
    }

    return createResult([{total: sumBy(rows, 'total')}]);
  }

  if (normalizedSql.includes('left join products')) {
    const joinedRows = rows.map(sale => {
      const product = getProduct(sale.product_id);
      return {
        ...sale,
        amount: sale.total,
        payment_method: sale.payment_method || 'cash',
        product_name: product?.name || null,
        title: product?.name || null,
        kind: 'sale',
      };
    });

    if (normalizedSql.includes('group by sales.product_id')) {
      const grouped = joinedRows.reduce((acc, sale) => {
        const key = sale.product_id;
        acc[key] = acc[key] || {
          product_name: sale.product_name,
          total_quantity: 0,
        };
        acc[key].total_quantity += Number(sale.quantity || 0);
        return acc;
      }, {});

      return createResult(
        Object.values(grouped)
          .sort((left, right) => right.total_quantity - left.total_quantity)
          .slice(0, 1),
      );
    }

    return createResult(sortBy(joinedRows, 'date', 'DESC'));
  }

  return createResult(sortBy(rows, 'date', 'DESC'));
};

const executeExpensesSelect = (normalizedSql, params) => {
  const dbState = loadState();
  const hasDateRange = normalizedSql.includes('where date between');
  const rows = hasDateRange
    ? rowsInRange(dbState.expenses, params)
    : dbState.expenses;

  if (normalizedSql.includes('count(*) as count')) {
    return createResult([{count: countUnsynced('expenses')}]);
  }

  if (normalizedSql.includes('sum(amount)')) {
    if (normalizedSql.includes('group by category')) {
      const grouped = rows.reduce((acc, expense) => {
        acc[expense.category] =
          (acc[expense.category] || 0) + Number(expense.amount || 0);
        return acc;
      }, {});

      return createResult(
        Object.entries(grouped)
          .map(([category, total]) => ({category, total}))
          .sort((left, right) => right.total - left.total)
          .slice(0, normalizedSql.includes('limit 1') ? 1 : undefined),
      );
    }

    if (normalizedSql.includes('group by substr')) {
      return createResult(groupByDay(rows, 'amount'));
    }

    return createResult([{total: sumBy(rows, 'amount')}]);
  }

  return createResult(sortBy(rows, 'date', 'DESC').slice(0, 25));
};

const executeServicesSelect = (normalizedSql, params) => {
  const dbState = loadState();
  const rows = normalizedSql.includes('where date between')
    ? rowsInRange(dbState.services, params)
    : dbState.services;

  if (normalizedSql.includes('count(*) as count')) {
    return createResult([{count: countUnsynced('services')}]);
  }

  if (normalizedSql.includes('sum(amount)')) {
    if (normalizedSql.includes('group by substr')) {
      return createResult(groupByDay(rows, 'amount'));
    }

    if (normalizedSql.includes('group by service_type')) {
      const grouped = rows.reduce((acc, service) => {
        acc[service.service_type] =
          (acc[service.service_type] || 0) + Number(service.amount || 0);
        return acc;
      }, {});

      return createResult(
        Object.entries(grouped)
          .map(([service_type, total]) => ({service_type, total}))
          .sort((left, right) => right.total - left.total),
      );
    }

    return createResult([
      rows.reduce(
        (acc, service) => {
          const method = service.payment_method || 'cash';
          acc.revenue += Number(service.amount || 0);
          acc[method] += Number(service.amount || 0);
          return acc;
        },
        {revenue: 0, cash: 0, bank: 0},
      ),
    ]);
  }

  if (normalizedSql.includes('count(*)')) {
    const grouped = rows.reduce((acc, service) => {
      acc[service.service_type] = (acc[service.service_type] || 0) + 1;
      return acc;
    }, {});

    return createResult(
      Object.entries(grouped)
        .map(([service_type, total_count]) => ({service_type, total_count}))
        .sort((left, right) => right.total_count - left.total_count)
        .slice(0, 1),
    );
  }

  return createResult(
    sortBy(
      rows.map(service => ({
        ...service,
        title: service.service_type,
        kind: 'service',
      })),
      'date',
      'DESC',
    ),
  );
};

const executeSelect = (normalizedSql, params) => {
  if (normalizedSql.includes('from settings')) {
    return executeSettingsSelect(params);
  }

  if (normalizedSql.includes('from daily_balance')) {
    return executeDailyBalanceSelect(normalizedSql);
  }

  if (normalizedSql.includes('from service_types')) {
    return createResult(sortBy(loadState().service_types, 'name'));
  }

  if (normalizedSql.includes('from products')) {
    return executeProductsSelect(normalizedSql, params);
  }

  if (normalizedSql.includes('from sales')) {
    return executeSalesSelect(normalizedSql, params);
  }

  if (normalizedSql.includes('from expenses')) {
    return executeExpensesSelect(normalizedSql, params);
  }

  if (normalizedSql.includes('from services')) {
    return executeServicesSelect(normalizedSql, params);
  }

  return createResult([]);
};

const upsertSetting = (key, value) => {
  const dbState = loadState();
  dbState.settings = dbState.settings.filter(setting => setting.key !== key);
  dbState.settings.push({key, value: String(value)});
};

const executeInsert = (normalizedSql, params) => {
  const dbState = loadState();

  if (normalizedSql.includes('into products')) {
    const [
      id,
      name,
      category,
      cost_price,
      selling_price,
      quantity,
      min_threshold,
      updated_at,
      synced,
    ] = params;
    dbState.products = dbState.products.filter(product => product.id !== id);
    dbState.products.push({
      id,
      name,
      category,
      cost_price,
      selling_price,
      quantity,
      min_threshold,
      updated_at,
      synced,
    });
  }

  if (normalizedSql.includes('into sales')) {
    const hasPaymentMethod = normalizedSql.includes('payment_method');
    const [id, product_id, quantity, total] = params;
    const payment_method = hasPaymentMethod ? params[4] : 'cash';
    const date = hasPaymentMethod ? params[5] : params[4];
    const synced = hasPaymentMethod ? params[6] : params[5];
    dbState.sales = dbState.sales.filter(sale => sale.id !== id);
    dbState.sales.push({
      id,
      product_id,
      quantity,
      total,
      payment_method,
      date,
      synced,
    });
  }

  if (normalizedSql.includes('into expenses')) {
    const [id, category, description, amount, date, synced] = params;
    dbState.expenses = dbState.expenses.filter(expense => expense.id !== id);
    dbState.expenses.push({id, category, description, amount, date, synced});
  }

  if (normalizedSql.includes('into services')) {
    const [id, service_type, amount, payment_method, date, notes, synced] =
      params;
    dbState.services = dbState.services.filter(service => service.id !== id);
    dbState.services.push({
      id,
      service_type,
      amount,
      payment_method,
      date,
      notes,
      synced,
    });
  }

  if (normalizedSql.includes('into service_types')) {
    const [id, name, created_at] = params;
    dbState.service_types = dbState.service_types.filter(
      item => item.id !== id,
    );
    dbState.service_types.push({id, name, created_at});
  }

  if (normalizedSql.includes('into daily_balance')) {
    getTodayBalanceRow();
  }

  if (normalizedSql.includes('into settings')) {
    upsertSetting(params[0], params[1]);
  }

  saveState();
  return createResult([]);
};

const executeUpdate = (normalizedSql, params) => {
  const dbState = loadState();

  if (normalizedSql.includes('update products')) {
    if (normalizedSql.includes('set quantity')) {
      const [quantity, updated_at, id] = params;
      dbState.products = dbState.products.map(product =>
        product.id === id
          ? {...product, quantity, updated_at, synced: 0}
          : product,
      );
    } else if (normalizedSql.includes('where id = ?')) {
      const [
        name,
        category,
        cost_price,
        selling_price,
        quantity,
        min_threshold,
        updated_at,
        id,
      ] = params;
      dbState.products = dbState.products.map(product =>
        product.id === id
          ? {
              ...product,
              name,
              category,
              cost_price,
              selling_price,
              quantity,
              min_threshold,
              updated_at,
              synced: 0,
            }
          : product,
      );
    }
  }

  if (normalizedSql.includes('update daily_balance')) {
    const [amount, date] = params;
    const row =
      dbState.daily_balance.find(item => item.date === date) ||
      getTodayBalanceRow();
    const column = normalizedSql.match(/set ([a-z_]+) =/)?.[1];

    if (column) {
      row[column] = Number(row[column] || 0) + Number(amount || 0);
    }
  }

  if (normalizedSql.includes('set synced = 1 where id = ?')) {
    const tableName = normalizedSql.match(
      /update (products|sales|expenses|services)/,
    )?.[1];
    const id = params[0];

    if (tableName) {
      dbState[tableName] = dbState[tableName].map(row =>
        row.id === id ? {...row, synced: 1} : row,
      );
    }
  }

  saveState();
  return createResult([]);
};

const executeDelete = (normalizedSql, params) => {
  const dbState = loadState();

  if (normalizedSql.includes('from products')) {
    dbState.products = dbState.products.filter(
      product => product.id !== params[0],
    );
  }

  if (normalizedSql.includes('from service_types')) {
    dbState.service_types = dbState.service_types.filter(
      item => item.id !== params[0],
    );
  }

  saveState();
  return createResult([]);
};

const executeSql = async (sql, params = []) => {
  const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ').trim();

  if (
    normalizedSql.startsWith('create table') ||
    normalizedSql.startsWith('alter table')
  ) {
    return [createResult([])];
  }

  if (normalizedSql.startsWith('select')) {
    return [executeSelect(normalizedSql, params)];
  }

  if (normalizedSql.startsWith('insert')) {
    return [executeInsert(normalizedSql, params)];
  }

  if (normalizedSql.startsWith('update')) {
    return [executeUpdate(normalizedSql, params)];
  }

  if (normalizedSql.startsWith('delete')) {
    return [executeDelete(normalizedSql, params)];
  }

  return [createResult([])];
};

const database = {
  executeSql,
  transaction: (callback, onError, onSuccess) => {
    const tx = {
      executeSql: (sql, params = []) => {
        executeSql(sql, params).catch(error => {
          if (onError) {
            onError(error);
          }
        });
      },
    };

    try {
      callback(tx);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (onError) {
        onError(error);
      }
    }
  },
};

export const getDBConnection = async () => database;

export const initDatabase = async () => {
  loadState();
  getTodayBalanceRow();
  saveState();
  return database;
};

export const getTodayBalance = async () => getTodayBalanceRow();

export const updateDailyBalance = async (type, method, amount) => {
  const dbState = loadState();
  const row = getTodayBalanceRow();
  const normalizedType = type === 'services' ? 'services' : 'sales';
  const normalizedMethod = method === 'bank' ? 'bank' : 'cash';
  const column = `${normalizedType}_${normalizedMethod}`;

  row[column] = Number(row[column] || 0) + Number(amount || 0);
  saveState();

  return dbState.daily_balance.find(item => item.date === getTodayKey());
};

export const resetBalanceIfNewDay = async () => getTodayBalanceRow();

export const getSetting = async key => {
  const setting = loadState().settings.find(item => item.key === key);
  return setting ? setting.value : null;
};

export const setSetting = async (key, value) => {
  upsertSetting(key, value);
  saveState();
  return String(value);
};
