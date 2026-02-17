const P = require('./ProductRepository');
const O = require('./OrderRepository');

module.exports = {
  getProducts: (...a) => P.getAll(...a),
  getProductById: (...a) => P.getById(...a),
  createProduct: (...a) => P.create(...a),
  updateProduct: (...a) => P.update(...a),
  deleteProduct: (...a) => P.delete(...a),
  getCategories: (...a) => P.getCategories(...a),
  createOrder: (...a) => O.createOrder(...a),
  getOrderByNumber: (...a) => O.getByOrderNumber(...a),
  getOrderById: (...a) => O.getById(...a),
  getOrders: (...a) => O.getAll(...a),
  updateOrderStatus: (...a) => O.updateStatus(...a),
  ProductRepository: P,
  OrderRepository: O,
};