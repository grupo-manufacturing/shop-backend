const ALLOWED_CATEGORIES = ['T-Shirts', 'Polo', 'Hoodies', 'Sweatshirts', 'Joggers', 'Shorts', 'Caps', 'Jackets'];
const ALLOWED_COLORS = ['White', 'Black', 'Navy', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Purple', 'Brown', 'Beige', 'Maroon', 'Teal', 'Olive', 'Cream', 'Charcoal', 'Sky Blue', 'Burgundy'];
const ALLOWED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

function validateOrder(req, res, next) {
  const { productId, color, size, quantity, tier, customer } = req.body;
  const e = [];

  if (!productId) e.push('productId is required');
  if (!color) e.push('color is required');
  if (!size) e.push('size is required');
  if (!tier) e.push('tier is required');

  if (!quantity) e.push('quantity is required');
  else if (!Number.isInteger(quantity) || quantity < 10) e.push('quantity must be a whole number >= 10');

  if (!customer) {
    e.push('customer object is required');
  } else {
    if (!customer.fullName?.trim()) e.push('customer.fullName is required');
    if (!customer.email) e.push('customer.email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) e.push('customer.email is invalid');
    if (!customer.phone) e.push('customer.phone is required');
    if (!customer.address?.trim()) e.push('customer.address is required');
    if (!customer.city?.trim()) e.push('customer.city is required');
    if (!customer.state?.trim()) e.push('customer.state is required');
    if (!customer.pincode) e.push('customer.pincode is required');
    else if (!/^\d{6}$/.test(customer.pincode)) e.push('customer.pincode must be a 6-digit number');
  }

  if (e.length) return res.status(400).json({ error: 'Validation failed', details: e });
  next();
}

function validateProduct(req, res, next) {
  let { name, category, image, bulk_pricing, colors, sizes } = req.body;
  const e = [];

  if (typeof colors === 'string') try { colors = JSON.parse(colors); } catch { }
  if (typeof sizes === 'string') try { sizes = JSON.parse(sizes); } catch { }

  if (!name?.trim()) e.push('name is required');

  if (!category?.trim()) e.push('category is required');
  else if (!ALLOWED_CATEGORIES.includes(category.trim()))
    e.push(`category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);

  if (Array.isArray(colors)) {
    const inv = colors.filter(c => !ALLOWED_COLORS.includes(c));
    if (inv.length) e.push(`Invalid color(s): ${inv.join(', ')}. Allowed: ${ALLOWED_COLORS.join(', ')}`);
  }

  if (Array.isArray(sizes)) {
    const inv = sizes.filter(s => !ALLOWED_SIZES.includes(s));
    if (inv.length) e.push(`Invalid size(s): ${inv.join(', ')}. Allowed: ${ALLOWED_SIZES.join(', ')}`);
  }

  if (!image && !req.file) e.push('image is required (upload a file or provide a URL)');

  if (!Array.isArray(bulk_pricing) || !bulk_pricing.length) {
    e.push('bulk_pricing must be a non-empty array');
  } else {
    bulk_pricing.forEach((tier, i) => {
      if (!tier.label) e.push(`bulk_pricing[${i}].label is required`);
      if (!tier.range) e.push(`bulk_pricing[${i}].range is required`);
      if (tier.unitPrice == null) e.push(`bulk_pricing[${i}].unitPrice is required`);
    });
  }

  if (e.length) return res.status(400).json({ error: 'Validation failed', details: e });
  next();
}

module.exports = { validateOrder, validateProduct, ALLOWED_CATEGORIES, ALLOWED_COLORS, ALLOWED_SIZES };