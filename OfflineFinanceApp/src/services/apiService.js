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

apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const method = error?.config?.method?.toUpperCase();
    const url = error?.config?.url;
    const responseData = error?.response?.data;

    console.error('[API] Axios error response:', {
      status,
      method,
      url,
      data: responseData,
      message: error.message,
    });

    if (status === 401) {
      console.error('Token is invalid or expired');
    }

    return Promise.reject(error);
  },
);

export const registerUser = data => apiClient.post('/auth/register', data);

export const loginUser = data => apiClient.post('/auth/login', data);

export const googleAuth = idToken => apiClient.post('/auth/google', {idToken});

export const postProduct = data => apiClient.post('/api/products', data);

export const getProducts = () => apiClient.get('/api/products');

export const postSale = data => apiClient.post('/api/sales', data);

export const getSales = () => apiClient.get('/api/sales');

export const postExpense = data => apiClient.post('/api/expenses', data);

export const getExpenses = () => apiClient.get('/api/expenses');

export const postService = data => apiClient.post('/api/services', data);

export const getServices = () => apiClient.get('/api/services');

export const postServiceType = data => apiClient.post('/api/service-types', data);

export const getServiceTypes = () => apiClient.get('/api/service-types');

export const apiService = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
};

export default apiClient;
