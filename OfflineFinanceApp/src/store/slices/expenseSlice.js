import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  expenses: [],
  isLoading: false,
  error: null,
};

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    setExpenses: (state, action) => {
      state.expenses = action.payload;
    },
    addExpense: (state, action) => {
      state.expenses.push(action.payload);
    },
    setExpenseLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setExpenseError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {setExpenses, addExpense, setExpenseLoading, setExpenseError} =
  expenseSlice.actions;

export default expenseSlice.reducer;
