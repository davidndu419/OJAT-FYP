require('dotenv').config();

const express = require('express');
const cors = require('cors');
require('./config/firebase');

const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const expensesRoutes = require('./routes/expenses');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Offline Finance backend is running',
  });
});

app.use('/auth', authRoutes);
app.use('/api/products', authMiddleware, productsRoutes);
app.use('/api/sales', authMiddleware, salesRoutes);
app.use('/api/expenses', authMiddleware, expensesRoutes);

app.use((req, res) => {
  res.status(400).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  res.status(500).json({ message: 'Server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
