const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: true
  },
  campground: {
    type: mongoose.Schema.ObjectId,
    ref: 'Campground',
    required: true
  },
  paymentMethod: {
    type: mongoose.Schema.ObjectId,
    ref: 'PaymentMethod',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add the payment amount']
  },
  status: {
    type: String,
    default: 'success'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,
});

module.exports = mongoose.model('Transaction', TransactionSchema);
