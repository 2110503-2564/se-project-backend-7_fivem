const express = require("express");
const {
  getTransaction,
  getTransactions,
} = require("../controllers/transaction");

const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

router.route("/").get(protect, authorize("admin", "user"), getTransactions);
router.route("/:id").get(protect, authorize("admin", "user"), getTransaction);

module.exports = router;
