const Transaction = require("../models/Transaction");

// @desc    Get single transaction by ID
// @route   GET /api/v1/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("booking campground paymentMethod");

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all transactions of the logged-in user (or all if admin)
// @route   GET /api/v1/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    // ถ้าเป็น admin => ไม่ filter ด้วย user
    const query = req.user.role === "admin" ? {} : { user: req.user.id };

    const transactions = await Transaction.find(query)
      .sort({ transactionDate: -1 })
      .populate("booking campground paymentMethod");

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};
