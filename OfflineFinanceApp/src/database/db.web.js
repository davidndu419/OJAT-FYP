const STORAGE_KEY = 'ojat_web_preview_db';

const createInitialState = () => ({
  products: [],
  sales: [],
  expenses: [],
});

let state = null;

const loadState = () => {
  if (state) {
    return state;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    state = stored ? JSON.parse(stored) : createInitialState();
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

  return [...rows].sort((left, right) =>
    String(left[field] || '').localeCompare(String(right[field] || '')) *
    multiplier,
  );
};

const sumBy = (rows, field) =>
  rows.reduce((total, row) => total + Number(row[field] || 0), 0);

const countUnsynced = tableName =>
  loadState()[tableName].filter(row => Number(row.synced || 0) === 0).length;

const executeSelect = (normalizedSql, params) => {
  const dbState = loadState();

  if (normalizedSql.includes('count(*) as count')) {
    const tableName = normalizedSql.match(/from (products|sales|expenses)/)?.[1];
    return createResult([{count: tableName ? countUnsynced(tableName) : 0}]);
  }

  if (normalizedSql.includes('from products')) {
    if (normalizedSql.includes('where coalesce(quantity')) {
      return createResult(
        sortBy(
          dbState.products.filter(
            product =>
              Number(product.quantity || 0) <
              Number(product.min_threshold || 0),
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
  }

  if (normalizedSql.includes('from sales')) {
    if (normalizedSql.includes('sum(total)')) {
      const [start, end] = params;
      const rows = dbState.sales.filter(sale => between(sale.date, start, end));

      if (normalizedSql.includes('group by substr')) {
        const grouped = rows.reduce((acc, sale) => {
          const day = String(sale.date).slice(0, 10);
          acc[day] = (acc[day] || 0) + Number(sale.total || 0);
          return acc;
        }, {});

        return createResult(
          Object.entries(grouped).map(([day, total]) => ({day, total})),
        );
      }

      return createResult([{total: sumBy(rows, 'total')}]);
    }

    if (normalizedSql.includes('left join products')) {
      const [start, end] = params;
      const rows = dbState.sales
        .filter(sale => between(sale.date, start, end))
        .map(sale => ({
          ...sale,
          product_name:
            dbState.products.find(product => product.id === sale.product_id)
              ?.name || null,
        }));

      if (normalizedSql.includes('group by sales.product_id')) {
        const grouped = rows.reduce((acc, sale) => {
          const key = sale.product_id;
          acc[key] = acc[key] || {
            product_name: sale.product_name,
            total_quantity: 0,
          };
          acc[key].total_quantity += Number(sale.quantity || 0);
          return acc;
        }, {});

        return createResult(
          Object.values(grouped).sort(
            (left, right) => right.total_quantity - left.total_quantity,
          ).slice(0, 1),
        );
      }

      return createResult(sortBy(rows, 'date', 'DESC'));
    }

    return createResult(sortBy(dbState.sales, 'date', 'DESC'));
  }

  if (normalizedSql.includes('from expenses')) {
    const [start, end] = params;
    const hasDateRange = normalizedSql.includes('where date between');
    const rows = hasDateRange
      ? dbState.expenses.filter(expense => between(expense.date, start, end))
      : dbState.expenses;

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

      return createResult([{total: sumBy(rows, 'amount')}]);
    }

    return createResult(sortBy(rows, 'date', 'DESC').slice(0, 25));
  }

  return createResult([]);
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
    const [id, product_id, quantity, total, date, synced] = params;
    dbState.sales = dbState.sales.filter(sale => sale.id !== id);
    dbState.sales.push({id, product_id, quantity, total, date, synced});
  }

  if (normalizedSql.includes('into expenses')) {
    const [id, category, description, amount, date, synced] = params;
    dbState.expenses = dbState.expenses.filter(expense => expense.id !== id);
    dbState.expenses.push({id, category, description, amount, date, synced});
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
        product.id === id ? {...product, quantity, updated_at, synced: 0} : product,
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

  if (normalizedSql.includes('set synced = 1 where id = ?')) {
    const tableName = normalizedSql.match(/update (products|sales|expenses)/)?.[1];
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
    dbState.products = dbState.products.filter(product => product.id !== params[0]);
  }

  saveState();
  return createResult([]);
};

const executeSql = async (sql, params = []) => {
  const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ').trim();

  if (normalizedSql.startsWith('create table')) {
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
  saveState();
  return database;
};
