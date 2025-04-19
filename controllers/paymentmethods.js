const PaymentMethod = require('../models/PaymentMethod');

// @desc    Get all payment methods of a user
// @route   GET /api/payment-methods
// @access  Private
exports.getPaymentMethods = async (req, res) => {
    try {
        const methods = await PaymentMethod.find({ user: req.user.id });
        res.status(200).json({ success: true, count: methods.length, data: methods });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get one payment methods of a user
// @route   GET /api/payment-method
// @access  Private
exports.getPaymentMethod = async (req, res) => {
    try {
        const paymentMethod = await PaymentMethod.findById(req.params.id).populate('user', 'name email');
        if (!paymentMethod) {
            return res.status(404).json({ success: false, error: 'Payment method not found' });
        }

        res.status(200).json({ success: true, data: paymentMethod });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Add a new payment method
// @route   POST /api/payment-methods
// @access  Private
exports.addPaymentMethod = async (req, res) => {
    try {
        const data = {
            user: req.user.id,
            method: req.body.method,
            cardNumber: req.body.cardNumber,
            bankAccountNumber: req.body.bankAccountNumber,
            bankName: req.body.bankName,
            paypalEmail: req.body.paypalEmail
        };

        const paymentMethod = await PaymentMethod.create(data);
        res.status(201).json({ success: true, data: paymentMethod });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update a payment method
// @route   PUT /api/payment-methods/:id
// @access  Private
exports.updatePaymentMethod = async (req, res) => {
    try {
        let method = await PaymentMethod.findById(req.params.id);

        if (!method) {
            return res.status(404).json({ success: false, error: 'Payment method not found' });
        }

        // Check if the user owns this method
        if (method.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }

        // Apply updates
        method.method = req.body.method || method.method;
        method.cardNumber = req.body.cardNumber || method.cardNumber;
        method.bankAccountNumber = req.body.bankAccountNumber || method.bankAccountNumber;
        method.bankName = req.body.bankName || method.bankName;
        method.paypalEmail = req.body.paypalEmail || method.paypalEmail;

        await method.save(); // will trigger pre-save encryption

        res.status(200).json({ success: true, data: method });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete a payment method
// @route   DELETE /api/payment-methods/:id
// @access  Private
exports.deletePaymentMethod = async (req, res) => {
    try {
        const method = await PaymentMethod.findById(req.params.id);

        if (!method) {
            return res.status(404).json({ success: false, error: 'Payment method not found' });
        }

        // Check if the user owns this method
        if (method.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }

        await method.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
