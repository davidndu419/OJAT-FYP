import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  products: [],
  selectedProduct: null,
  isLoading: false,
  error: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setProducts: (state, action) => {
      state.products = action.payload;
    },
    addProduct: (state, action) => {
      state.products.push(action.payload);
    },
    updateProduct: (state, action) => {
      const index = state.products.findIndex(
        product => product.id === action.payload.id,
      );

      if (index !== -1) {
        state.products[index] = action.payload;
      }
    },
    removeProduct: (state, action) => {
      state.products = state.products.filter(
        product => product.id !== action.payload,
      );
    },
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
    },
    setInventoryLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setInventoryError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  setSelectedProduct,
  setInventoryLoading,
  setInventoryError,
} = inventorySlice.actions;

export default inventorySlice.reducer;
