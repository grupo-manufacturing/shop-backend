const router = require('express').Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../services/database');
const razorpay = require('../config/razorpay');
const { validateOrder } = require('../middleware/validate');

const SHIPPING_COST = 299;
const ORDER_EXPIRY_MS = 30 * 60 * 1000;

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests — please wait a minute before trying again' },
});
const VALID_STATUSES = [
  'pending', 'payment_pending', 'confirmed', 'processing',
  'shipped', 'delivered', 'cancelled', 'payment_failed'
];

// ─── Razorpay: create order + initiate payment ────────────────────
router.post('/create-order', paymentLimiter, validateOrder, async (req, res) => {
  try {
    const { productId, variations, quantity, tier, customer } = req.body;

    const product = await db.getProductById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.in_stock) return res.status(400).json({ error: 'Product is currently out of stock' });

    const matchedTier = product.bulk_pricing.find(t => t.label === tier);
    if (!matchedTier) return res.status(400).json({ error: `Invalid tier: ${tier}` });
    const subtotal = matchedTier.unitPrice * quantity;
    const totalAmount = subtotal + SHIPPING_COST;
    const amountInPaise = Math.round(totalAmount * 100);

    const order = await db.createOrder({
      product_id: product.id, product_name: product.name, product_image: product.image,
      variations, quantity, tier,
      unit_price: matchedTier.unitPrice, total_amount: totalAmount,
      customer_name: customer.fullName.trim(), customer_email: customer.email.trim().toLowerCase(),
      customer_phone: customer.phone.trim(), customer_company: customer.company?.trim() || null,
      address: customer.address.trim(), city: customer.city.trim(),
      state: customer.state.trim(), pincode: customer.pincode.trim(),
      status: 'payment_pending', payment_status: 'pending', amount_in_paise: amountInPaise,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.order_number,
      partial_payment: false,
      notes: { grupo_order_id: order.id, product_name: product.name },
    });

    await db.updatePaymentDetails(order.id, { razorpay_order_id: razorpayOrder.id });

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.order_number,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error('[create-order]', e);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ─── Razorpay: verify payment signature ───────────────────────────
router.post('/verify-payment', paymentLimiter, async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing required payment verification fields' });
    }

    const order = await db.getOrderById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') {
      return res.json({
        message: 'Payment already verified',
        order: {
          id: order.id, orderNumber: order.order_number, productName: order.product_name,
          quantity: order.quantity, tier: order.tier, totalAmount: order.total_amount,
          status: order.status, paymentStatus: order.payment_status, createdAt: order.created_at,
        },
      });
    }
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    if (orderAge > ORDER_EXPIRY_MS) {
      await db.updatePaymentDetails(orderId, { payment_status: 'failed', status: 'cancelled' });
      return res.status(400).json({ error: 'Order has expired — please create a new order' });
    }

    if (order.razorpay_order_id !== razorpayOrderId) {
      return res.status(400).json({ error: 'Razorpay order ID mismatch' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await db.updatePaymentDetails(orderId, { payment_status: 'failed', status: 'payment_failed' });
      return res.status(400).json({ error: 'Invalid payment signature — possible tampering detected' });
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (payment.status !== 'captured') {
      await db.updatePaymentDetails(orderId, { razorpay_payment_id: razorpayPaymentId, payment_status: 'failed', status: 'payment_failed' });
      return res.status(400).json({ error: `Payment not captured — status is "${payment.status}"` });
    }
    if (payment.amount !== order.amount_in_paise) {
      await db.updatePaymentDetails(orderId, { razorpay_payment_id: razorpayPaymentId, payment_status: 'failed', status: 'payment_failed' });
      return res.status(400).json({ error: `Amount mismatch — expected ${order.amount_in_paise} paise, got ${payment.amount} paise` });
    }
    if (payment.currency !== 'INR') {
      await db.updatePaymentDetails(orderId, { razorpay_payment_id: razorpayPaymentId, payment_status: 'failed', status: 'payment_failed' });
      return res.status(400).json({ error: `Currency mismatch — expected INR, got ${payment.currency}` });
    }

    const updated = await db.updatePaymentDetails(orderId, {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      payment_status: 'paid',
      payment_method: payment.method || null,
      status: 'confirmed',
    });

    res.json({
      message: 'Payment verified successfully',
      order: {
        id: updated.id, orderNumber: updated.order_number, productName: updated.product_name,
        quantity: updated.quantity, tier: updated.tier, totalAmount: updated.total_amount,
        status: updated.status, paymentStatus: updated.payment_status, createdAt: updated.created_at,
      },
    });
  } catch (e) {
    console.error('[verify-payment]', e);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ─── Razorpay: handle frontend-reported failure / dismissal ───────
router.post('/payment-failed', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const order = await db.getOrderById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') {
      return res.json({ message: 'Order is already paid — cannot mark as failed' });
    }

    await db.updatePaymentDetails(orderId, { payment_status: 'failed', status: 'payment_failed' });
    res.json({ message: 'Order marked as payment failed' });
  } catch (e) {
    console.error('[payment-failed]', e);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// ─── Customer-facing order tracking (sanitised) ──────────────────
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await db.getOrderByNumber(req.params.orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({
      order: {
        orderNumber:   order.order_number,
        productName:   order.product_name,
        productImage:  order.product_image,
        variations:    order.variations,
        quantity:      order.quantity,
        tier:          order.tier,
        unitPrice:     order.unit_price,
        totalAmount:   order.total_amount,
        status:        order.status,
        city:          order.city,
        state:         order.state,
        createdAt:     order.created_at,
        updatedAt:     order.updated_at,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch order' }); }
});

// ─── Read (admin) ─────────────────────────────────────────────────
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

// ─── Admin: update status ─────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    res.json({ order: await db.updateOrderStatus(req.params.id, status) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update order status' }); }
});

module.exports = router;