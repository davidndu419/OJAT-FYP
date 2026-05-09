const express = require('express');
const db = require('../config/firebase');

const router = express.Router();

const userServicesCollection = (userId) => db
  .collection('users')
  .doc(userId)
  .collection('services');

const getRecordId = (record) => {
  if (!record || record.id === undefined || record.id === null || String(record.id).trim() === '') {
    return null;
  }

  const id = String(record.id).trim();
  return id.includes('/') ? null : id;
};

// GET /api/services — return all services for logged-in user
router.get('/', async (req, res) => {
  try {
    const snapshot = await userServicesCollection(req.userId).get();
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ services });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching services' });
  }
});

// POST /api/services — immutable insert (no updates)
router.post('/', async (req, res) => {
  try {
    const recordId = getRecordId(req.body);

    if (!recordId) {
      return res.status(400).json({ message: 'A valid service id is required' });
    }

    const { service_type, amount, payment_method, date } = req.body;

    if (!service_type || service_type === undefined) {
      return res.status(400).json({ message: 'service_type is required' });
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'amount is required' });
    }

    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }

    if (payment_method && !['cash', 'bank'].includes(payment_method)) {
      return res.status(400).json({ message: 'payment_method must be cash or bank' });
    }

    const service = {
      id: recordId,
      service_type: req.body.service_type,
      amount: req.body.amount,
      payment_method: req.body.payment_method || 'cash',
      date: req.body.date,
      notes: req.body.notes || '',
      userId: req.userId,
    };
    const serviceRef = userServicesCollection(req.userId).doc(recordId);

    const result = await db.runTransaction(async (transaction) => {
      const serviceDoc = await transaction.get(serviceRef);

      if (serviceDoc.exists) {
        // Services are immutable — return existing record unchanged
        return {
          status: 200,
          service: {
            id: serviceDoc.id,
            ...serviceDoc.data(),
          },
        };
      }

      transaction.set(serviceRef, service);
      return { status: 201, service };
    });

    return res.status(result.status).json({ service: result.service });
  } catch (error) {
    return res.status(500).json({ message: 'Server error saving service' });
  }
});

module.exports = router;
