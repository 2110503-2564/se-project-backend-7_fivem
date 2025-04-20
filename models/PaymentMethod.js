const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
  // Bank account fields
  bankAccountNumber: {
    type: String,
    select: false,
    match: [
      /^\d{10,12}$/, // 10 ถึง 12 ตัวเลขเท่านั้น
      "Please provide a valid Thai bank account number (10-12 digits)",
    ],
    required: function () {
      return this.method === "bank_account";
    },
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

// Encrypt sensitive fields before saving
PaymentMethodSchema.pre("save", async function (next) {
  if (this.method === "credit_card" && this.isModified("cardNumber")) {
    const salt = "$2b$10$123456789012345678901u";
    this.cardNumber = await bcrypt.hash(this.cardNumber, salt);
  }

  if (this.method === "bank_account" && this.isModified("bankAccountNumber")) {
    const salt = "$2b$10$123456789012345678901u";
    this.bankAccountNumber = await bcrypt.hash(this.bankAccountNumber, salt);
  }

  //next();
});

// Compare methods
/*
PaymentMethodSchema.methods.matchCardNumber = async function (enteredNumber) {
    return await bcrypt.compare(enteredNumber, this.cardNumber);
};

PaymentMethodSchema.methods.matchBankAccountNumber = async function (enteredNumber) {
    return await bcrypt.compare(enteredNumber, this.bankAccountNumber);
};*/

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema);
