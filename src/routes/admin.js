const router = require('express').Router();
const db = require('../services/database');

router.get('/manufacturers', async (req, res) => {
  try {
    const manufacturers = await db.getManufacturers();
    res.json({ manufacturers });
  } catch (e) {
    console.error('[admin manufacturers list]', e);
    res.status(500).json({ error: 'Failed to fetch manufacturers' });
  }
});

router.post('/manufacturers', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '').trim();
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'name, phone and password are required' });
    }

    const existingByName = await db.getManufacturerByName(name);
    if (existingByName) {
      return res.status(409).json({ error: 'Manufacturer with this name already exists' });
    }
    const existingByPhone = await db.getManufacturerByPhone(phone);
    if (existingByPhone) {
      return res.status(409).json({ error: 'Manufacturer with this phone already exists' });
    }

    const manufacturer = await db.createManufacturer({ name, phone, password });
    res.status(201).json({
      manufacturer: {
        id: manufacturer.id,
        name: manufacturer.name,
        phone: manufacturer.phone,
      },
    });
  } catch (e) {
    console.error('[admin manufacturers create]', e);
    res.status(500).json({ error: 'Failed to create manufacturer' });
  }
});

router.put('/manufacturers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body?.name != null ? String(req.body.name).trim() : undefined;
    const phone = req.body?.phone != null ? String(req.body.phone).trim() : undefined;
    const password = req.body?.password != null ? String(req.body.password).trim() : undefined;

    const existing = await db.getManufacturerById(id);
    if (!existing) return res.status(404).json({ error: 'Manufacturer not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (password !== undefined && password !== '') updates.password = password;

    if (updates.name) {
      const byName = await db.getManufacturerByName(updates.name);
      if (byName && byName.id !== id) {
        return res.status(409).json({ error: 'Manufacturer with this name already exists' });
      }
    }
    if (updates.phone) {
      const byPhone = await db.getManufacturerByPhone(updates.phone);
      if (byPhone && byPhone.id !== id) {
        return res.status(409).json({ error: 'Manufacturer with this phone already exists' });
      }
    }

    const manufacturer = await db.updateManufacturer(id, updates);
    if (!manufacturer) return res.status(404).json({ error: 'Manufacturer not found' });
    res.json({ manufacturer });
  } catch (e) {
    console.error('[admin manufacturers update]', e);
    res.status(500).json({ error: 'Failed to update manufacturer' });
  }
});

router.delete('/manufacturers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteManufacturer(id);
    if (!deleted) return res.status(404).json({ error: 'Manufacturer not found' });
    res.json({ message: 'Manufacturer deleted successfully' });
  } catch (e) {
    console.error('[admin manufacturers delete]', e);
    if ((e.message || '').toLowerCase().includes('foreign key')) {
      return res.status(400).json({ error: 'Cannot delete manufacturer with linked products/orders' });
    }
    res.status(500).json({ error: 'Failed to delete manufacturer' });
  }
});

module.exports = router;
