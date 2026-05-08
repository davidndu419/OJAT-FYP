import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  sales: [],
  isLoading: false,
  error: null,
};

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setSales: (state, action) => {
      state.sales = action.payload;
    },
    addSale: (state, action) => {
      state.sales.push(action.payload);
    },
    setSalesLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setSalesError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {setSales, addSale, setSalesLoading, setSalesError} =
  salesSlice.actions;

export default salesSlice.reducer;
