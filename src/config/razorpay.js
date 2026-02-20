const Razorpay = require('razorpay');

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing — payment features will not work.');
}

if (process.env.NODE_ENV === 'production' && process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) {
  throw new Error('[Razorpay] FATAL: Test keys detected in production. Set live keys (rzp_live_*) before deploying.');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;
