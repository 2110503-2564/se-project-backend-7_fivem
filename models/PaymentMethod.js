const mongoose = require("mongoose");
const crypto = require("crypto");

const bankNames = [
  "KBank", // กสิกรไทย
  "SCB", // ไทยพาณิชย์
  "BBL", // กรุงเทพ
  "Krungsri", // กรุงศรีอยุธยา
  "KTB", // กรุงไทย
  "TTB", // ทหารไทยธนชาต
  "BAAC", // ธ.ก.ส.
  "GSB", // ออมสิน
  "CIMB",
  "UOB",
];

const PaymentMethodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  method: {
    type: String,
    enum: ["credit_card", "bank_account"],
    required: [true, "Please select a payment method"],
  },
  cardNumber: {
    type: String,
    minlength: 13,
    maxlength: 19,
    select: false,
    required: function () {
      return this.method === "credit_card";
    },
  },
  cardFingerprint: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  bankAccountNumber: {
    type: String,
    select: false,
    match: [
      /^\d{10,12}$/,
      "Please provide a valid Thai bank account number (10-12 digits)",
    ],
    required: function () {
      return this.method === "bank_account";
    },
  },
  bankAccountFingerprint: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  bankName: {
    type: String,
    enum: bankNames,
    required: function () {
      return this.method === "bank_account";
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔥 ใช้ SHA-256 ทำ Fingerprint ก่อน save
PaymentMethodSchema.pre("save", async function (next) {
  if (this.method === "credit_card" && this.isModified("cardNumber")) {
    this.cardFingerprint = crypto
      .createHash("sha256")
      .update(this.cardNumber)
      .digest("hex");
  }

  if (this.method === "bank_account" && this.isModified("bankAccountNumber")) {
    this.bankAccountFingerprint = crypto
      .createHash("sha256")
      .update(this.bankAccountNumber)
      .digest("hex");
  }

  next();
});

// (ไม่ต้องมี matchCardNumber / matchBankAccountNumber method แล้ว เพราะหาแบบ query ได้เลย)

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema);
