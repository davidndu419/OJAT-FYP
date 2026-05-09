const express = require('express');
const db = require('../config/firebase');

const router = express.Router();

const userServiceTypesCollection = (userId) => db
  .collection('users')
  .doc(userId)
  .collection('service_types');

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

// GET /api/service-types — return all service types for logged-in user
router.get('/', async (req, res) => {
  try {
    const snapshot = await userServiceTypesCollection(req.userId).get();
    const serviceTypes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ serviceTypes });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching service types' });
  }
});

// POST /api/service-types — upsert with updated_at comparison
router.post('/', async (req, res) => {
  try {
    const recordId = getRecordId(req.body);

    if (!recordId) {
      return res.status(400).json({ message: 'A valid service type id is required' });
    }

    if (!req.body.name || String(req.body.name).trim() === '') {
      return res.status(400).json({ message: 'name is required' });
    }

    if (!hasValidUpdatedAt(req.body)) {
      return res.status(400).json({ message: 'A valid updated_at timestamp is required' });
    }

    const serviceType = {
      id: recordId,
      name: String(req.body.name).trim(),
      created_at: req.body.created_at || new Date().toISOString(),
      updated_at: req.body.updated_at,
      userId: req.userId,
    };
    const serviceTypeRef = userServiceTypesCollection(req.userId).doc(recordId);

    const result = await db.runTransaction(async (transaction) => {
      const serviceTypeDoc = await transaction.get(serviceTypeRef);

      if (!serviceTypeDoc.exists) {
        transaction.set(serviceTypeRef, serviceType);
        return { status: 201, serviceType };
      }

      const existing = {
        id: serviceTypeDoc.id,
        ...serviceTypeDoc.data(),
      };

      if (timestampValue(serviceType.updated_at) > timestampValue(existing.updated_at)) {
        transaction.set(serviceTypeRef, serviceType, { merge: true });
        return { status: 200, serviceType };
      }

      return { status: 200, serviceType: existing };
    });

    return res.status(result.status).json({ serviceType: result.serviceType });
  } catch (error) {
    return res.status(500).json({ message: 'Server error saving service type' });
  }
});

// DELETE /api/service-types/:id — delete only if belongs to this user
router.delete('/:id', async (req, res) => {
  try {
    const recordId = getRecordId({ id: req.params.id });

    if (!recordId) {
      return res.status(400).json({ message: 'A valid service type id is required' });
    }

    const serviceTypeRef = userServiceTypesCollection(req.userId).doc(recordId);
    const serviceTypeDoc = await serviceTypeRef.get();

    if (!serviceTypeDoc.exists) {
      return res.status(404).json({ message: 'Service type not found' });
    }

    await serviceTypeRef.delete();

    return res.status(200).json({ message: 'Service type deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting service type' });
  }
});

module.exports = router;
