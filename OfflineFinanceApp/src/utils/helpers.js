import uuid from 'react-native-uuid';
import {formatISO} from 'date-fns';

export const generateId = () => uuid.v4().toString();

export const getCurrentTimestamp = () => formatISO(new Date());

export const getRowsArray = result => {
  const rows = [];

  for (let index = 0; index < result.rows.length; index += 1) {
    rows.push(result.rows.item(index));
  }

  return rows;
};

export const formatCurrency = amount => {
  const value = Number(amount || 0);

  return `NGN ${value.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
