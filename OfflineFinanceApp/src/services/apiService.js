import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, STORAGE_KEYS} from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error),
);

export const postProduct = data => apiClient.post('/products', data);

export const getProducts = () => apiClient.get('/products');

export const postSale = data => apiClient.post('/sales', data);

export const getSales = () => apiClient.get('/sales');

export const postExpense = data => apiClient.post('/expenses', data);

export const getExpenses = () => apiClient.get('/expenses');

export const apiService = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
};

export default apiClient;
