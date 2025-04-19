const express = require('express');
const router = express.Router();
const { getPaymentMethods, getPaymentMethod, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = require('../controllers/paymentmethods');

const { protect, authorize } = require('../middleware/auth');

router.route('/').get(protect, authorize('admin', 'user'), getPaymentMethods).post(protect, authorize('admin', 'user'), addPaymentMethod);
router.route('/:id').get(protect, authorize('admin', 'user'), getPaymentMethod).put(protect, authorize('admin', 'user'), updatePaymentMethod).delete(protect, authorize('admin', 'user'), deletePaymentMethod);

module.exports = router;