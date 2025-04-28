const Transaction = require("../models/Transaction");

//ลบtry catch ทั้งหมด
const { Parser } = require('json2csv');

exports.downloadTransactions = async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { user: req.user.id };

    const transactions = await Transaction.find(query)
      .sort({ transactionDate: -1 })
      .populate("booking campground paymentMethod")
      .lean();

    if (!transactions.length) {
      return res.status(404).json({ error: 'No transactions found' });
    }

    const json2csv = new Parser();
    const csv = json2csv.parse(transactions);

    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'CSV export failed' });
  }
};


// @desc    Get single transaction by ID
// @route   GET /api/v1/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  
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
  
};

// @desc    Get all transactions of the logged-in user (or all if admin)
// @route   GET /api/v1/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  
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
};
