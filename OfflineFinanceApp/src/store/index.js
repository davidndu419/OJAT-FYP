import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import salesReducer from './slices/salesSlice';
import expenseReducer from './slices/expenseSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inventory: inventoryReducer,
    sales: salesReducer,
    expenses: expenseReducer,
  },
});
