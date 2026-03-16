const P = require('./ProductRepository');
const O = require('./OrderRepository');
const M = require('./ManufacturerRepository');

module.exports = {
  getProducts: (...a) => P.getAll(...a),
  getProductById: (...a) => P.getById(...a),
  createProduct: (...a) => P.create(...a),
  updateProduct: (...a) => P.update(...a),
  deleteProduct: (...a) => P.delete(...a),
  getCategories: (...a) => P.getCategories(...a),
  getManufacturers: (...a) => M.getAll(...a),
  getManufacturerById: (...a) => M.getById(...a),
  getManufacturerByName: (...a) => M.findByName(...a),
  getManufacturerByPhone: (...a) => M.findByPhone(...a),
  createManufacturer: (...a) => M.create(...a),
  updateManufacturer: (...a) => M.update(...a),
  deleteManufacturer: (...a) => M.delete(...a),
  createOrder: (...a) => O.createOrder(...a),
  getOrderByNumber: (...a) => O.getByOrderNumber(...a),
  getOrderById: (...a) => O.getById(...a),
  getOrders: (...a) => O.getAll(...a),
  updateOrderStatus: (...a) => O.updateStatus(...a),
  updatePaymentDetails: (...a) => O.updatePaymentDetails(...a),
  cancelExpiredOrders: (...a) => O.cancelExpiredOrders(...a),
  ProductRepository: P,
  OrderRepository: O,
  ManufacturerRepository: M,
};