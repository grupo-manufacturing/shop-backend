-- ============================================
-- Grupo Shop Database Schema
-- ============================================

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'T-Shirts', 'Polo', 'Hoodies', 'Sweatshirts',
    'Joggers', 'Shorts', 'Caps', 'Jackets'
  )),
  description TEXT,
  image TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}' CHECK (colors <@ ARRAY[
    'White', 'Black', 'Navy', 'Gray', 'Red', 'Blue', 'Green',
    'Yellow', 'Orange', 'Pink', 'Purple', 'Brown', 'Beige',
    'Maroon', 'Teal', 'Olive', 'Cream', 'Charcoal', 'Sky Blue', 'Burgundy'
  ]::TEXT[]),
  sizes TEXT[] DEFAULT '{}' CHECK (sizes <@ ARRAY[
    'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'
  ]::TEXT[]),
  bulk_pricing JSONB NOT NULL DEFAULT '[]',
  manufacturing_time INTEGER NOT NULL DEFAULT 7,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================

-- Sequence for auto-incrementing order numbers
CREATE SEQUENCE IF NOT EXISTS shop_order_seq START WITH 1;

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL DEFAULT ('GRUPO-ORD-' || LPAD(nextval('shop_order_seq')::TEXT, 4, '0')),
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_image TEXT,
  variations JSONB NOT NULL DEFAULT '[]',
  quantity INTEGER NOT NULL CHECK (quantity >= 10),
  tier TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_company TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL CHECK (LENGTH(pincode) = 6),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'payment_pending', 'confirmed', 'processing',
    'shipped', 'delivered', 'cancelled', 'payment_failed'
  )),

  -- Razorpay payment fields
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  amount_in_paise INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_orders_order_number ON shop_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_shop_orders_product_id ON shop_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_customer_email ON shop_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_orders_razorpay_order_id ON shop_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_payment_status ON shop_orders(payment_status);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on products
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trigger_shop_orders_updated_at
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
