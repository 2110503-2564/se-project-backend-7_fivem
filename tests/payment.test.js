const mongoose = require("mongoose");
const request = require("supertest");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/.env.test" });

const app = require("../server");
const User = require("../models/User");
const PaymentMethod = require("../models/PaymentMethod");

const testUser = {
  name: "Test User",
  email: "test@example.com",
  tel: "0812345681",
  password: "password123",
};

let token;
let userId;
let paymentMethodId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
    await User.deleteMany({});
    await PaymentMethod.deleteMany({});

  // Register and login test user
  const registerRes = await request(app)
    .post("/api/v1/auth/register")
    .send(testUser);
  const loginRes = await request(app).post("/api/v1/auth/login").send({
    email: testUser.email,
    password: testUser.password,
  });

  token = loginRes.body.token;
  userId = loginRes.body.data.id;
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await PaymentMethod.deleteMany({});
    await mongoose.connection.close();
  }
});

describe("Payment Method Routes", () => {
  describe("GET /api/paymentmethod", () => {
    it("should get all payment methods for authenticated user", async () => {
      // First add a payment method
      await PaymentMethod.create({
        user: userId,
        name: "Test Card",
        method: "credit_card",
        cardNumber: "4111111111111111",
      });

      const res = await request(app)
        .get("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should return empty array if no payment methods exist", async () => {
      // Clear all payment methods first
      await PaymentMethod.deleteMany({ user: userId });

      const res = await request(app)
        .get("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.data.length).toBe(0);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/api/v1/paymentmethod");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/paymentmethod/:id", () => {
    beforeAll(async () => {
      // Create a test payment method
      const method = await PaymentMethod.create({
        user: userId,
        name: "Test Card",
        method: "credit_card",
        cardNumber: "4111111111111111",
      });
      paymentMethodId = method._id;
    });

    afterAll(async () => {
      PaymentMethod.deleteOne({ user: userId });
    });

    it("should get a single payment method by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/paymentmethod/${paymentMethodId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(paymentMethodId.toString());
    });

    it("should return 404 if payment method not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/paymentmethod/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Payment method not found");
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get(
        `/api/v1/paymentmethod/${paymentMethodId}`,
      );
      expect(res.statusCode).toBe(401);
    });

    it("should return error for invalid ID format", async () => {
      const res = await request(app)
        .get("/api/v1/paymentmethod/invalid-id")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/paymentmethod", () => {
    beforeAll(async () => {
      await PaymentMethod.deleteMany({ user: userId });
    });

    it("should add a new credit card payment method", async () => {
      const res = await request(app)
        .post("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Visa Card",
          method: "credit_card",
          cardNumber: "4111111111111111",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.method).toBe("credit_card");
      expect(res.body.data.cardNumber).toBe("4111111111111111"); // Should be hidden
    });

    it("should add a new bank account payment method", async () => {
      const res = await request(app)
        .post("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "KBank Account",
          method: "bank_account",
          bankAccountNumber: "1234567890",
          bankName: "KBank",
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.method).toBe("bank_account");
      expect(res.body.data.bankAccountNumber).toBe("1234567890"); // Should be hidden
    });

    it("should return 400 for duplicate credit card", async () => {
      // First add the card
      await request(app)
        .post("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Visa Card",
          method: "credit_card",
          cardNumber: "4222222222222222",
        });

      // Try to add same card again
      const res = await request(app)
        .post("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Visa Card Duplicate",
          method: "credit_card",
          cardNumber: "4222222222222222",
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Payment method already exists");
    });
    //
    it("should return 400 for duplicate bank account", async () => {
      // First add the account
      await request(app)
        .post("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "KBank Account",
          method: "bank_account",
          bankAccountNumber: "9876543210",
          bankName: "KBank",
        });

      // Try to add same account again
      const res = await request(app)
        .post("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "KBank Account Duplicate",
          method: "bank_account",
          bankAccountNumber: "9876543210",
          bankName: "KBank",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Payment method already exists");
    });

    it("should return 400 for missing required fields", async () => {
      const res = await request(app)
        .post("/api/v1/paymentmethod")
        .set("Authorization", `Bearer ${token}`)
        .send({
          method: "credit_card",
          // Missing name and cardNumber
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).post("/api/v1/paymentmethod").send({
        name: "Test Card",
        method: "credit_card",
        cardNumber: "4111111111111111",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("PUT /api/paymentmethod/:id", () => {
    let testMethodId;

    beforeEach(async () => {
      // Create a test payment method
      await PaymentMethod.deleteMany({});
      const method = await PaymentMethod.create({
        user: userId,
        name: "Test Card",
        method: "credit_card",
        cardNumber: "4111111111111111",
      });
      testMethodId = method._id;
    });

    it("should update payment method name", async () => {
      const res = await request(app)
        .put(`/api/v1/paymentmethod/${testMethodId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Updated Card Name",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Card Name");
    });

    it("should change from credit card to bank account", async () => {
      const res = await request(app)
        .put(`/api/v1/paymentmethod/${testMethodId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          method: "bank_account",
          bankAccountNumber: "1234567890",
          bankName: "KBank",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.method).toBe("bank_account");
      expect(res.body.data.bankName).toBe("KBank");
      expect(res.body.data.cardNumber).toBeUndefined();
    });

    it("should change from bank account to credit card", async () => {
      // First create a bank account
      const bankMethod = await PaymentMethod.create({
        user: userId,
        name: "Test Bank",
        method: "bank_account",
        bankAccountNumber: "1234567890",
        bankName: "KBank",
      });

      const res = await request(app)
        .put(`/api/v1/paymentmethod/${bankMethod._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          method: "credit_card",
          cardNumber: "5555555555555555",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.method).toBe("credit_card");
      expect(res.body.data.bankName).toBeUndefined();
    });

    it("should return 400 if payment failed", async () => {
      const bankMethod = await PaymentMethod.create({
        user: userId,
        name: "Test Bank",
        method: "bank_account",
        bankAccountNumber: "1234567890",
        bankName: "KBank",
      });

      const res = await request(app)
        .put(`/api/v1/paymentmethod/${bankMethod._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          method: "credit_card",
          name: "Updated Name",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 if payment method not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/paymentmethod/${fakeId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Updated Name",
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 if not authorized to update", async () => {
      // Create a different user's payment method
      await User.deleteOne({ email: "other@example.com" });

      const otherUser = await User.create({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
        tel: "0812345692",
      });

      await PaymentMethod.deleteMany({ method: "credit_card" });

      const otherMethod = await PaymentMethod.create({
        user: otherUser._id,
        name: "Other Card",
        method: "credit_card",
        cardNumber: "4999999999999",
      });

      const res = await request(app)
        .put(`/api/v1/paymentmethod/${otherMethod._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Should Not Update",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
  //------------------------------------------

  describe("DELETE /api/paymentmethod/:id", () => {
    let testMethodId;

    beforeEach(async () => {
      // Create a test payment method
      await PaymentMethod.deleteMany({ user: userId });
      const method = await PaymentMethod.create({
        user: userId,
        name: "Test Card",
        method: "credit_card",
        cardNumber: "4111111111111111",
      });
      testMethodId = method._id;
    });

    it("should delete a payment method", async () => {
      const res = await request(app)
        .delete(`/api/v1/paymentmethod/${testMethodId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({});

      // Verify it's actually deleted
      const deletedMethod = await PaymentMethod.findById(testMethodId);
      expect(deletedMethod).toBeNull();
    });

    it("should return 404 if payment method not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/paymentmethod/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 if not authorized to delete", async () => {
      // Create a different user's payment method
      await User.deleteOne({ email: "other@example.com" });
      const otherUser = await User.create({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
        tel: "0812345693",
      });

      await PaymentMethod.deleteMany({ method: "credit_card" });
      const otherMethod = await PaymentMethod.create({
        user: otherUser._id,
        name: "Other Card",
        method: "credit_card",
        cardNumber: "4111111111111111",
      });

      const res = await request(app)
        .delete(`/api/v1/paymentmethod/${otherMethod._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
