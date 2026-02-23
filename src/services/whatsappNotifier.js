const { wasender, enabled } = require('../config/wasender');

function formatPhone(phone) {
  return phone.replace(/[\+\s\-\(\)]/g, '');
}

async function send(phone, text) {
  if (!enabled) return;
  try {
    await wasender.post('/send-message', { to: formatPhone(phone), text });
    console.log(`[WhatsApp] Notification sent to ${phone}`);
  } catch (e) {
    console.error('[WhatsApp] Failed to send:', e.response?.data?.message || e.message);
  }
}

function notifyOrderConfirmed(order) {
  const msg = `✅ *Order Confirmed!*

Hi ${order.customer_name}, your order has been placed successfully!

🧾 *Order:* ${order.order_number}
👕 *Product:* ${order.product_name}
📦 *Qty:* ${order.quantity} units (${order.tier})
💰 *Total:* ₹${order.total_amount.toLocaleString('en-IN')}

📍 *Shipping to:* ${order.city}, ${order.state}

Track your order anytime:
https://grupo.in/shop/track?order=${order.order_number}

Thank you for shopping with Grupo!`;

  return send(order.customer_phone, msg);
}

function notifyOrderShipped(order) {
  const msg = `🚚 *Order Shipped!*

Hi ${order.customer_name}, great news — your order is on its way!

🧾 *Order:* ${order.order_number}
👕 *Product:* ${order.product_name}
📍 *Delivering to:* ${order.city}, ${order.state}

Track your order:
https://grupo.in/shop/track?order=${order.order_number}`;

  return send(order.customer_phone, msg);
}

function notifyOrderDelivered(order) {
  const msg = `📦 *Order Delivered!*

Hi ${order.customer_name}, your order has been delivered!

🧾 *Order:* ${order.order_number}
👕 *Product:* ${order.product_name}

We hope you love your order. Thank you for choosing Grupo!`;

  return send(order.customer_phone, msg);
}

function notifyOrderCancelled(order) {
  const msg = `❌ *Order Cancelled*

Hi ${order.customer_name}, your order has been cancelled.

🧾 *Order:* ${order.order_number}
👕 *Product:* ${order.product_name}

If money was deducted, it will be refunded within 5–7 business days. For any queries, please contact our support team.`;

  return send(order.customer_phone, msg);
}

module.exports = {
  notifyOrderConfirmed,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyOrderCancelled,
};
