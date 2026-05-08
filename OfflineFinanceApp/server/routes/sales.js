const express = require('express');
const db = require('../config/firebase');

const router = express.Router();

const userSalesCollection = (userId) => db
  .collection('users')
  .doc(userId)
  .collection('sales');

const getRecordId = (record) => {
  if (!record || record.id === undefined || record.id === null || String(record.id).trim() === '') {
    return null;
  }

  const id = String(record.id).trim();
  return id.includes('/') ? null : id;
};

router.get('/', async (req, res) => {
  try {
    const snapshot = await userSalesCollection(req.userId).get();
    const sales = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ sales });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching sales' });
  }
});

router.post('/', async (req, res) => {
  try {
    const recordId = getRecordId(req.body);

    if (!recordId) {
      return res.status(400).json({ message: 'A valid sale id is required' });
    }

    const sale = {
      ...req.body,
      id: recordId,
    };
    const saleRef = userSalesCollection(req.userId).doc(recordId);

    const result = await db.runTransaction(async (transaction) => {
      const saleDoc = await transaction.get(saleRef);

      if (saleDoc.exists) {
        return {
          status: 200,
          sale: {
            id: saleDoc.id,
            ...saleDoc.data(),
          },
        };
      }

      transaction.set(saleRef, sale);
      return { status: 201, sale };
    });

    return res.status(result.status).json({ sale: result.sale });
  } catch (error) {
    return res.status(500).json({ message: 'Server error saving sale' });
  }
});

module.exports = router;
