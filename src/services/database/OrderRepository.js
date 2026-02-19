const { BaseRepository, supabase } = require('./BaseRepository');

class OrderRepository extends BaseRepository {
  async createOrder(orderData) {
    const { data, error } = await supabase.from('shop_orders').insert([orderData]).select().single();
    if (error) throw new Error(`Failed to create order: ${error.message}`);
    return data;
  }

  async getByOrderNumber(orderNumber) {
    const { data, error } = await supabase.from('shop_orders').select('*').eq('order_number', orderNumber).single();
    if (error) { if (this.isNotFoundError(error)) return null; throw new Error(`Failed to fetch order: ${error.message}`); }
    return data;
  }

  async getById(orderId) {
    const { data, error } = await supabase.from('shop_orders').select('*').eq('id', orderId).single();
    if (error) { if (this.isNotFoundError(error)) return null; throw new Error(`Failed to fetch order: ${error.message}`); }
    return data;
  }

  async getAll({ status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    let q = supabase.from('shop_orders').select('*', { count: 'exact' });
    if (status) q = q.eq('status', status);
    const { data, error, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    return { orders: data || [], total: count || 0, page: Number(page), totalPages: Math.ceil((count || 0) / limit) };
  }

  async updateStatus(orderId, status) {
    const { data, error } = await supabase.from('shop_orders').update({ status }).eq('id', orderId).select().single();
    if (error) throw new Error(`Failed to update order status: ${error.message}`);
    return data;
  }

  async updatePaymentDetails(orderId, fields) {
    const { data, error } = await supabase.from('shop_orders').update(fields).eq('id', orderId).select().single();
    if (error) throw new Error(`Failed to update payment details: ${error.message}`);
    return data;
  }
}

module.exports = new OrderRepository();