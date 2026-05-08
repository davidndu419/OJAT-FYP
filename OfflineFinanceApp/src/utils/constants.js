import {Platform} from 'react-native';

export const DATABASE_NAME = 'offline_finance_inventory.db';

const LIVE_API_BASE_URL =
  'https://ojat-fyp-ayea-git-main-davidndu419s-projects.vercel.app';

export const API_BASE_URL = Platform.OS === 'web' ? '' : LIVE_API_BASE_URL;

export const GOOGLE_WEB_CLIENT_ID = '1045013112182-dopbt8l7racsqdo5hg9jlm97a031br8o.apps.googleusercontent.com';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
};

export const TABLE_NAMES = {
  PRODUCTS: 'products',
  SALES: 'sales',
  EXPENSES: 'expenses',
};
