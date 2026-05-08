const express = require('express');
const db = require('../config/firebase');

const router = express.Router();

const userExpensesCollection = (userId) => db
  .collection('users')
  .doc(userId)
  .collection('expenses');

const getRecordId = (record) => {
  if (!record || record.id === undefined || record.id === null || String(record.id).trim() === '') {
    return null;
  }

  const id = String(record.id).trim();
  return id.includes('/') ? null : id;
};

router.get('/', async (req, res) => {
  try {
    const snapshot = await userExpensesCollection(req.userId).get();
    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ expenses });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching expenses' });
  }
});

router.post('/', async (req, res) => {
  try {
    const recordId = getRecordId(req.body);

    if (!recordId) {
      return res.status(400).json({ message: 'A valid expense id is required' });
    }

    const expense = {
      ...req.body,
      id: recordId,
    };
    const expenseRef = userExpensesCollection(req.userId).doc(recordId);

    const result = await db.runTransaction(async (transaction) => {
      const expenseDoc = await transaction.get(expenseRef);

      if (expenseDoc.exists) {
        return {
          status: 200,
          expense: {
            id: expenseDoc.id,
            ...expenseDoc.data(),
          },
        };
      }

      transaction.set(expenseRef, expense);
      return { status: 201, expense };
    });

    return res.status(result.status).json({ expense: result.expense });
  } catch (error) {
    return res.status(500).json({ message: 'Server error saving expense' });
  }
});

module.exports = router;
