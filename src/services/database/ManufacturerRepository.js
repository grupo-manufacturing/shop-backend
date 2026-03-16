const { BaseRepository, supabase } = require('./BaseRepository');

class ManufacturerRepository extends BaseRepository {
  async create({ name, phone, password }) {
    const { data, error } = await supabase
      .from('shop_manufacturers')
      .insert([{ name, phone, password }])
      .select()
      .single();
    if (error) throw new Error(`Failed to create manufacturer: ${error.message}`);
    return data;
  }

  async getAll() {
    const { data, error } = await supabase
      .from('shop_manufacturers')
      .select('id, name, phone')
      .order('name', { ascending: true });
    if (error) throw new Error(`Failed to fetch manufacturers: ${error.message}`);
    return data || [];
  }

  async getById(id) {
    const { data, error } = await supabase
      .from('shop_manufacturers')
      .select('id, name, phone')
      .eq('id', id)
      .single();
    if (error) {
      if (this.isNotFoundError(error)) return null;
      throw new Error(`Failed to fetch manufacturer: ${error.message}`);
    }
    return data;
  }

  async findByName(name) {
    const { data, error } = await supabase
      .from('shop_manufacturers')
      .select('*')
      .eq('name', name)
      .single();
    if (error) {
      if (this.isNotFoundError(error)) return null;
      throw new Error(`Failed to fetch manufacturer by name: ${error.message}`);
    }
    return data;
  }

  async findByPhone(phone) {
    const { data, error } = await supabase
      .from('shop_manufacturers')
      .select('*')
      .eq('phone', phone)
      .single();
    if (error) {
      if (this.isNotFoundError(error)) return null;
      throw new Error(`Failed to fetch manufacturer by phone: ${error.message}`);
    }
    return data;
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from('shop_manufacturers')
      .update(updates)
      .eq('id', id)
      .select('id, name, phone')
      .single();
    if (error) {
      if (this.isNotFoundError(error)) return null;
      throw new Error(`Failed to update manufacturer: ${error.message}`);
    }
    return data;
  }

  async delete(id) {
    const { data, error } = await supabase
      .from('shop_manufacturers')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw new Error(`Failed to delete manufacturer: ${error.message}`);
    return Array.isArray(data) && data.length > 0;
  }
}

module.exports = new ManufacturerRepository();
