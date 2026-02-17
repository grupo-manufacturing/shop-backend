const supabase = require('../../config/supabase');

class BaseRepository {
  constructor() { this.supabase = supabase; }
  isNotFoundError(e) { return e?.code === 'PGRST116'; }
  isUniqueViolation(e) { return e?.code === '23505'; }
}

module.exports = { BaseRepository, supabase };