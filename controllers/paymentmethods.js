const PaymentMethod = require("../models/PaymentMethod");

// @desc    Get all payment methods of a user
// @route   GET /api/payment-methods
// @access  Private
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ user: req.user.id });
    res
      .status(200)
      .json({ success: true, count: methods.length, data: methods });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Get one payment methods of a user
// @route   GET /api/payment-method
// @access  Private
exports.getPaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!paymentMethod) {
      return res
        .status(404)
        .json({ success: false, error: "Payment method not found" });
    }

    res.status(200).json({ success: true, data: paymentMethod });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Add a new payment method
// @route   POST /api/payment-methods
// @access  Private
const crypto = require("crypto");

exports.addPaymentMethod = async (req, res) => {
  try {
    let existing;

    if (req.body.method === "credit_card" && req.body.cardNumber) {
      const fingerprint = crypto
        .createHash("sha256")
        .update(req.body.cardNumber)
        .digest("hex");
      existing = await PaymentMethod.findOne({ cardFingerprint: fingerprint });
    }

    if (req.body.method === "bank_account" && req.body.bankAccountNumber) {
      const fingerprint = crypto
        .createHash("sha256")
        .update(req.body.bankAccountNumber)
        .digest("hex");
      existing = await PaymentMethod.findOne({
        bankAccountFingerprint: fingerprint,
      });
    }

    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: "Payment method already exists" });
    }

    const data = {
      user: req.user.id,
      method: req.body.method,
      cardNumber: req.body.cardNumber,
      bankAccountNumber: req.body.bankAccountNumber,
      bankName: req.body.bankName,
      label: req.body.label,
    };

    const paymentMethod = await PaymentMethod.create(data);
    res.status(201).json({ success: true, data: paymentMethod });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update a payment method
// @route   PUT /api/paymentmethod/:id
// @access  Private
exports.updatePaymentMethod = async (req, res) => {
  try {
    let method = await PaymentMethod.findById(req.params.id).select(
      "+cardNumber +bankAccountNumber",
    );

    if (!method) {
      return res
        .status(404)
        .json({ success: false, error: "Payment method not found" });
    }

    if (method.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: "Not authorized" });
    }

    if (req.body.method && req.body.method !== method.method) {
      method.method = req.body.method;
      if (req.body.method === "credit_card") {
        method.bankAccountNumber = undefined;
        method.bankName = undefined;
      }
      if (req.body.method === "bank_account") {
        method.cardNumber = undefined;
      }
    }

    if (req.body.cardNumber) {
      method.cardNumber = req.body.cardNumber;
      method.cardFingerprint = crypto
        .createHash("sha256")
        .update(req.body.cardNumber)
        .digest("hex");
    }

    if (req.body.bankAccountNumber) {
      method.bankAccountNumber = req.body.bankAccountNumber;
      method.bankAccountFingerprint = crypto
        .createHash("sha256")
        .update(req.body.bankAccountNumber)
        .digest("hex");
    }

    if (req.body.bankName) {
      method.bankName = req.body.bankName;
    }

    if (req.body.label) {
      method.label = req.body.label;
    }

    await method.save();

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
      return res
        .status(404)
        .json({ success: false, error: "Payment method not found" });
    }

    // Check if the user owns this method
    if (method.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: "Not authorized" });
    }

    await method.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
