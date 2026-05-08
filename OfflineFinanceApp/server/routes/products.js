const express = require('express');
const db = require('../config/firebase');

const router = express.Router();

const userProductsCollection = (userId) => db
  .collection('users')
  .doc(userId)
  .collection('products');

const getRecordId = (record) => {
  if (!record || record.id === undefined || record.id === null || String(record.id).trim() === '') {
    return null;
  }

  const id = String(record.id).trim();
  return id.includes('/') ? null : id;
};

const timestampValue = (value) => {
  if (value === undefined || value === null) {
    return Number.NaN;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed);

    if (trimmed !== '' && !Number.isNaN(numeric)) {
      return numeric;
    }

    return Date.parse(trimmed);
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  if (typeof value.seconds === 'number') {
    return (value.seconds * 1000) + Math.floor((value.nanoseconds || 0) / 1000000);
  }

  return Number.NaN;
};

const hasValidUpdatedAt = (record) => !Number.isNaN(timestampValue(record.updated_at));

router.get('/', async (req, res) => {
  try {
    const snapshot = await userProductsCollection(req.userId).get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching products' });
  }
});

router.post('/', async (req, res) => {
  try {
    const recordId = getRecordId(req.body);

    if (!recordId) {
      return res.status(400).json({ message: 'A valid product id is required' });
    }

    if (!hasValidUpdatedAt(req.body)) {
      return res.status(400).json({ message: 'A valid updated_at timestamp is required' });
    }

    const incomingProduct = {
      ...req.body,
      id: recordId,
    };
    const productRef = userProductsCollection(req.userId).doc(recordId);

    const result = await db.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists) {
        transaction.set(productRef, incomingProduct);
        return { status: 201, product: incomingProduct };
      }

      const existingProduct = {
        id: productDoc.id,
        ...productDoc.data(),
      };

      if (timestampValue(incomingProduct.updated_at) > timestampValue(existingProduct.updated_at)) {
        transaction.set(productRef, incomingProduct, { merge: true });
        return { status: 200, product: incomingProduct };
      }

      return { status: 200, product: existingProduct };
    });

    return res.status(result.status).json({ product: result.product });
  } catch (error) {
    return res.status(500).json({ message: 'Server error saving product' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const recordId = getRecordId({ id: req.params.id });

    if (!recordId) {
      return res.status(400).json({ message: 'A valid product id is required' });
    }

    if (!hasValidUpdatedAt(req.body)) {
      return res.status(400).json({ message: 'A valid updated_at timestamp is required' });
    }

    const incomingProduct = {
      ...req.body,
      id: recordId,
    };
    const productRef = userProductsCollection(req.userId).doc(recordId);

    const result = await db.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists) {
        return {
          status: 400,
          body: { message: 'Product does not exist. Use POST to sync new products.' },
        };
      }

      const existingProduct = {
        id: productDoc.id,
        ...productDoc.data(),
      };

      if (timestampValue(incomingProduct.updated_at) > timestampValue(existingProduct.updated_at)) {
        transaction.set(productRef, incomingProduct, { merge: true });
        return { status: 200, body: { product: incomingProduct } };
      }

      return { status: 200, body: { product: existingProduct } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating product' });
  }
});

module.exports = router;
