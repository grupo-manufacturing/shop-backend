const { BaseRepository, supabase } = require('./BaseRepository');

class ProductRepository extends BaseRepository {
  async getAll({ search, category, minPrice, maxPrice, inStock, sort = 'created_at', order = 'desc', page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    let q = supabase.from('products').select('*', { count: 'exact' });

    if (search) q = q.or(`name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
    if (category) q = q.eq('category', category);
    if (inStock != null) q = q.eq('in_stock', inStock === 'true' || inStock === true);

    const { data, error, count } = await q.order(sort, { ascending: order === 'asc' }).range(offset, offset + limit - 1);
    if (error) throw new Error(`Failed to fetch products: ${error.message}`);

    let products = data || [];
    if (minPrice || maxPrice) products = products.filter(p => {
      const price = p.bulk_pricing?.[0]?.unitPrice ?? 0;
      return !(minPrice && price < Number(minPrice)) && !(maxPrice && price > Number(maxPrice));
    });

    return { products, total: count || 0, page: Number(page), totalPages: Math.ceil((count || 0) / limit) };
  }

  async getById(productId) {
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error) { if (this.isNotFoundError(error)) return null; throw new Error(`Failed to fetch product: ${error.message}`); }
    return data;
  }

  async create(productData) {
    const { data, error } = await supabase.from('products').insert([productData]).select().single();
    if (error) throw new Error(`Failed to create product: ${error.message}`);
    return data;
  }

  async update(productId, updates) {
    const { data, error } = await supabase.from('products').update(updates).eq('id', productId).select().single();
    if (error) throw new Error(`Failed to update product: ${error.message}`);
    return data;
  }

  async delete(productId) {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw new Error(`Failed to delete product: ${error.message}`);
  }

  async getCategories() {
    const { data, error } = await supabase.from('products').select('category').order('category');
    if (error) throw new Error(`Failed to fetch categories: ${error.message}`);
    return [...new Set((data || []).map(d => d.category))];
  }
}

module.exports = new ProductRepository();