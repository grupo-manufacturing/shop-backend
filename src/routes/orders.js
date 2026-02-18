const router = require('express').Router();
const db = require('../services/database');
const { validateOrder } = require('../middleware/validate');

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

router.post('/', validateOrder, async (req, res) => {
  try {
    const { productId, variations, quantity, tier, customer } = req.body;
    const product = await db.getProductById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.in_stock) return res.status(400).json({ error: 'Product is currently out of stock' });

    const matchedTier = product.bulk_pricing.find(t => t.label === tier);
    if (!matchedTier) return res.status(400).json({ error: `Invalid tier: ${tier}` });

    const order = await db.createOrder({
      product_id: product.id, product_name: product.name, product_image: product.image,
      variations, quantity, tier,
      unit_price: matchedTier.unitPrice, total_amount: matchedTier.unitPrice * quantity,
      customer_name: customer.fullName.trim(), customer_email: customer.email.trim().toLowerCase(),
      customer_phone: customer.phone.trim(), customer_company: customer.company?.trim() || null,
      address: customer.address.trim(), city: customer.city.trim(),
      state: customer.state.trim(), pincode: customer.pincode.trim(), status: 'pending'
    });

    res.status(201).json({
      message: 'Order placed successfully', order: {
        id: order.id, orderNumber: order.order_number, productName: order.product_name,
        quantity: order.quantity, tier: order.tier, totalAmount: order.total_amount,
        status: order.status, createdAt: order.created_at
      }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to place order' }); }
});

router.get('/:orderNumber', async (req, res) => {
  try {
    const order = await db.getOrderByNumber(req.params.orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch order' }); }
});

router.get('/', async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    res.json(await db.getOrders({ status, page: Number(page) || 1, limit: Number(limit) || 20 }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    res.json({ order: await db.updateOrderStatus(req.params.id, status) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update order status' }); }
});

module.exports = router;