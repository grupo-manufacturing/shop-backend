const router = require('express').Router();
const multer = require('multer');
const db = require('../services/database');
const { uploadToCloudinary } = require('../config/cloudinary');
const { validateProduct, ALLOWED_CATEGORIES, ALLOWED_COLORS, ALLOWED_SIZES } = require('../middleware/validate');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true) : cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
});

const parseField = v => typeof v === 'string' ? JSON.parse(v) : v;
const cloudUpload = buf => uploadToCloudinary(buf, { folder: 'grupo-shop/products' });

router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, inStock, sort, order, page, limit } = req.query;
    res.json(await db.getProducts({
      search, category, minPrice, maxPrice, inStock,
      sort: sort || 'created_at', order: order || 'desc',
      page: Number(page) || 1, limit: Number(limit) || 20
    }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch products' }); }
});

router.get('/options', (req, res) =>
  res.json({ categories: ALLOWED_CATEGORIES, colors: ALLOWED_COLORS, sizes: ALLOWED_SIZES })
);

router.get('/categories', async (req, res) => {
  try {
    const dbCategories = await db.getCategories();
    const mergedCategories = [...new Set([...ALLOWED_CATEGORIES, ...dbCategories])].sort((a, b) => a.localeCompare(b));
    res.json({ categories: mergedCategories });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch categories' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch product' }); }
});

router.post('/', upload.single('image'), validateProduct, async (req, res) => {
  try {
    let imageUrl = req.body.image || '';
    if (req.file) imageUrl = (await cloudUpload(req.file.buffer)).secure_url;

    const colors = parseField(req.body.colors);
    const sizes = parseField(req.body.sizes);
    const bulk_pricing = parseField(req.body.bulk_pricing);
    const images = parseField(req.body.images) || [imageUrl];

    res.status(201).json({
      product: await db.createProduct({
        name: req.body.name.trim(), category: req.body.category.trim(),
        description: (req.body.description || '').trim(),
        size_chart_url: (req.body.size_chart_url || '').trim() || null,
        image: imageUrl, images, colors: colors || [], sizes: sizes || [],
        bulk_pricing, manufacturing_time: Number(req.body.manufacturing_time) || 7,
        in_stock: req.body.in_stock ?? true
      })
    });
  } catch (e) {
    console.error(e);
    if ((e.message || '').includes('violates check constraint "chk_products_category"')) {
      return res.status(400).json({
        error: 'Invalid category for products table. Please run the category constraint migration to include the new category.'
      });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await db.getProductById(req.params.id);
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

    res.json({ product: await db.updateProduct(req.params.id, updates) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update product' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!await db.getProductById(req.params.id))
      return res.status(404).json({ error: 'Product not found' });
    await db.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete product' }); }
});

module.exports = router;