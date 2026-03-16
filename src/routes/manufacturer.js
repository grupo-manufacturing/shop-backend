const router = require('express').Router();
const multer = require('multer');
const db = require('../services/database');
const { uploadToCloudinary } = require('../config/cloudinary');
const { validateProduct } = require('../middleware/validate');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true) : cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
});

const parseField = (v) => typeof v === 'string' ? JSON.parse(v) : v;
const cloudUpload = (buf) => uploadToCloudinary(buf, { folder: 'grupo-shop/products' });

const VALID_STATUSES = [
  'pending', 'payment_pending', 'confirmed', 'processing',
  'shipped', 'delivered', 'cancelled', 'payment_failed'
];

router.post('/login', async (req, res) => {
  try {
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '').trim();
    if (!phone || !password) return res.status(400).json({ error: 'phone and password are required' });

    const manufacturer = await db.getManufacturerByPhone(phone);
    if (!manufacturer || manufacturer.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      manufacturer: {
        id: manufacturer.id,
        name: manufacturer.name,
        phone: manufacturer.phone,
      },
    });
  } catch (e) {
    console.error('[manufacturer login]', e);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/:manufacturerId/products', async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const { search, category, minPrice, maxPrice, inStock, sort, order, page, limit } = req.query;
    const result = await db.getProducts({
      search, category, minPrice, maxPrice, inStock, manufacturerId,
      sort: sort || 'created_at', order: order || 'desc',
      page: Number(page) || 1, limit: Number(limit) || 20,
    });
    res.json(result);
  } catch (e) {
    console.error('[manufacturer products list]', e);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/:manufacturerId/products', upload.single('image'), validateProduct, async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const manufacturer = await db.getManufacturerById(manufacturerId);
    if (!manufacturer) return res.status(404).json({ error: 'Manufacturer not found' });

    let imageUrl = req.body.image || '';
    if (req.file) imageUrl = (await cloudUpload(req.file.buffer)).secure_url;

    const colors = parseField(req.body.colors);
    const sizes = parseField(req.body.sizes);
    const bulk_pricing = parseField(req.body.bulk_pricing);
    const images = parseField(req.body.images) || [imageUrl];

    const product = await db.createProduct({
      name: req.body.name.trim(),
      category: req.body.category.trim(),
      description: (req.body.description || '').trim(),
      size_chart_url: (req.body.size_chart_url || '').trim() || null,
      image: imageUrl,
      images,
      colors: colors || [],
      sizes: sizes || [],
      bulk_pricing,
      manufacturing_time: Number(req.body.manufacturing_time) || 7,
      in_stock: req.body.in_stock ?? true,
      manufacturer_id: manufacturerId,
    });

    res.status(201).json({ product });
  } catch (e) {
    console.error('[manufacturer products create]', e);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:manufacturerId/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { manufacturerId, id } = req.params;
    const existing = await db.ProductRepository.getByIdForManufacturer(id, manufacturerId);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const b = req.body;
    const updates = {};
    if (b.name) updates.name = b.name.trim();
    if (b.category) updates.category = b.category.trim();
    if (b.description != null) updates.description = b.description.trim();
    if (b.size_chart_url !== undefined) updates.size_chart_url = (b.size_chart_url || '').trim() || null;
    if (b.in_stock != null) updates.in_stock = b.in_stock;
    if (b.colors) updates.colors = parseField(b.colors);
    if (b.sizes) updates.sizes = parseField(b.sizes);
    if (b.bulk_pricing) updates.bulk_pricing = parseField(b.bulk_pricing);
    if (b.manufacturing_time != null) updates.manufacturing_time = Number(b.manufacturing_time);
    if (b.images) updates.images = parseField(b.images);
    updates.image = req.file ? (await cloudUpload(req.file.buffer)).secure_url : b.image || existing.image;

    const product = await db.ProductRepository.updateForManufacturer(id, manufacturerId, updates);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (e) {
    console.error('[manufacturer products update]', e);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:manufacturerId/products/:id', async (req, res) => {
  try {
    const { manufacturerId, id } = req.params;
    const deleted = await db.ProductRepository.deleteForManufacturer(id, manufacturerId);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (e) {
    console.error('[manufacturer products delete]', e);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

router.get('/:manufacturerId/orders', async (req, res) => {
  try {
    const { manufacturerId } = req.params;
    const { status, page, limit } = req.query;
    const result = await db.getOrders({
      status,
      manufacturerId,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    res.json(result);
  } catch (e) {
    console.error('[manufacturer orders list]', e);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.patch('/:manufacturerId/orders/:id/status', async (req, res) => {
  try {
    const { manufacturerId, id } = req.params;
    const status = String(req.body?.status || '').trim();
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const order = await db.OrderRepository.updateStatusForManufacturer(id, manufacturerId, status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (e) {
    console.error('[manufacturer orders update status]', e);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
