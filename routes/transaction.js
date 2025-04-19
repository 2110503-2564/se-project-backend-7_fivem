const express = require('express');
const { 
  addTransaction, 
  getTransaction, 
  getTransactions
} = require('../controllers/transaction');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.route('/').get(protect, getTransactions).post(protect, authorize('admin', 'user'), addTransaction);
router.route('/:id').get(protect, getTransaction);

module.exports = router;
