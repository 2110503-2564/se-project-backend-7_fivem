const mongoose = require("mongoose");
const request = require("supertest");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/.env.test" });

const app = require("../server");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Booking = require("../models/Booking");
const Campground = require("../models/Campground");
const PaymentMethod = require("../models/PaymentMethod");


// Test data
const testUser = {
  name: "Test User",
  email: "test@example.com",
  tel: "0812345681",
  password: "password123",
  role: "user",
};

const adminUser = {
  name: "Admin User",
  email: "admin@example.com",
  tel: "0812345682",
  password: "password123",
  role: "admin",
};

const testCampground = {
  name: "Test Campground",
  address: "123 Test St",
  district: "Test District",
  province: "Test Province",
  postalcode: "12345",
  tel: "0812345678",
  region: "Test Region",
  price: 1000,
};

describe("Transaction Routes", () => {
  let userToken, adminToken;
  let userId, adminId;
  let campgroundId, bookingId, paymentMethodId;
  let transactionId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Register test users with error handling
    let res = await request(app).post("/api/v1/auth/register").send(testUser);

    res = await request(app).post("/api/v1/auth/register").send(adminUser);

    // Login with error handling
    const userRes = await request(app).post("/api/v1/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    userToken = userRes.body.token;
    userId = userRes.body.data.id;

    const adminRes = await request(app).post("/api/v1/auth/login").send({
      email: adminUser.email,
      password: adminUser.password,
    });
    
    adminToken = adminRes.body.token;
    adminId = adminRes.body.data.id;
    console.log(adminToken);
   

    // Create test data
    const campground = await Campground.create(testCampground);
    campgroundId = campground._id;
    
    const paymentmethod = await PaymentMethod.create({
        user: userId,
        name: "Test Card",
        method: "credit_card",
        cardNumber: "4111111111111111",
    });
    paymentMethodId = paymentmethod._id;

    const booking = await Booking.create({
      user: userId,
      campground: campgroundId,
      apptDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      paymentMethod: paymentMethodId,
    });
    bookingId = booking._id;
   

    const transaction = await Transaction.create({
      user: userId,
      booking: bookingId,
      campground: campgroundId,
      paymentMethod: paymentMethodId,
      amount: testCampground.price,
      status: "success",
      paidAt: new Date(),
    });
    transactionId = transaction._id;
    console.log(transactionId);
  });

  afterAll(async () => {
    await Transaction.deleteMany({});
    await Booking.deleteMany({});
    await Campground.deleteMany({});
    await PaymentMethod.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe("Download Transactions", () => {
  
    it("should return only user's transactions in CSV for regular user", async () => {
      const res = await request(app)
        .get("/api/v1/transaction/download")
        .set("Authorization", `Bearer ${userToken}`);
  
      expect(res.statusCode).toBe(200);
      const rows = res.text.split("\n");
      // Header row + data row
      expect(rows.length).toBe(2);
      expect(res.text).toContain(userId.toString());
    });
  
    it("should return 404 if no transactions found", async () => {
      // Delete all transactions first
      await Transaction.deleteMany({});
  
      const res = await request(app)
        .get("/api/v1/transaction/download")
        .set("Authorization", `Bearer ${userToken}`);
  
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe("No transactions found");
  
      // Recreate transaction for other tests
      await Transaction.create({
        user: userId,
        booking: bookingId,
        campground: campgroundId,
        paymentMethod: paymentMethodId,
        amount: testCampground.price,
        status: "success",
        paidAt: new Date(),
      });
    });
  
    it("should handle CSV export error", async () => {
      // Mock Transaction.find to throw error
      const originalFind = Transaction.find;
      Transaction.find = jest.fn().mockImplementationOnce(() => {
        throw new Error("DB error");
      });
  
      const res = await request(app)
        .get("/api/v1/transaction/download")
        .set("Authorization", `Bearer ${adminToken}`);
  
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("CSV export failed");
  
      // Restore original implementation
      Transaction.find = originalFind;
    });
  });

  describe("GET /transaction", () => {
    
    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/api/v1/transactions");
      expect(res.statusCode).toBe(404);
    });
    
    it("should return only user's transactions for regular user", async () => {
      const res = await request(app)
        .get("/api/v1/transaction")
        .set("Authorization", `Bearer ${userToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].user).toBe(userId.toString());
    });

    it("should return all transactions for admin", async () => {
      // Create another transaction by different user
      const bookingId2 = await Booking.create({
        user: adminId,
        campground: campgroundId,
        apptDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        paymentMethod: paymentMethodId,
      });
      await Transaction.create({
        user: adminId,
        booking: bookingId2._id,
        campground: campgroundId,
        paymentMethod: paymentMethodId,
        amount: testCampground.price,
        status: "success",
        paidAt: new Date(),
      });

      const res = await request(app)
        .get("/api/v1/transaction")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should populate booking, campground and paymentMethod", async () => {
      const res = await request(app)
        .get("/api/v1/transaction")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data[0].booking).toHaveProperty("_id");
      expect(res.body.data[0].campground).toHaveProperty("_id");
      expect(res.body.data[0].paymentMethod).toHaveProperty("_id");
    });

    it("should sort by transactionDate in descending order", async () => {
      // Create a newer transaction
      const newTransaction = await Transaction.create({
        user: userId,
        booking: bookingId,
        campground: campgroundId,
        paymentMethod: paymentMethodId,
        amount: testCampground.price,
        status: "success",
        transactionDate: new Date(Date.now() + 10000),
        paidAt: new Date(),
      });

      const res = await request(app)
        .get("/api/v1/transaction")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data[0]._id).toBe(newTransaction._id.toString());
    });
  });

  describe("GET /transaction/:id", () => {

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get(
        `/api/v1/transaction/${transactionId}`,
      );
      expect(res.statusCode).toBe(401);
    });


    it("should return transaction if user owns it", async () => {
      console.log(`tx=`+transactionId);
      console.log(`user=`+userToken);
      console.log(`admin=`+adminToken);

      const transaction = await Transaction.create({
        user: userId,
        booking: bookingId,
        campground: campgroundId,
        paymentMethod: paymentMethodId,
        amount: testCampground.price,
        status: "success",
        paidAt: new Date(),
      });
      transactionId = transaction._id;
      const res = await request(app)
        .get(`/api/v1/transaction/${transactionId}`)
        .set("Authorization", `Bearer ${userToken}`);

      console.log(res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(transactionId.toString());
    });

    it("should return transaction if admin owns it", async () => {
      const transaction = await Transaction.create({
        user: userId,
        booking: bookingId,
        campground: campgroundId,
        paymentMethod: paymentMethodId,
        amount: testCampground.price,
        status: "success",
        paidAt: new Date(),
      });
      transactionId = transaction._id;
      const res = await request(app)
        .get(`/api/v1/transaction/${transactionId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(transactionId.toString());
    });

    it("should return 404 if transaction not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/transaction/${fakeId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 if transaction exists but user doesn't own it", async () => {
      // Create transaction by admin
      const adminTransaction = await Transaction.create({
        user: adminId,
        booking: bookingId,
        campground: campgroundId,
        paymentMethod: paymentMethodId,
        amount: testCampground.price,
        status: "success",
        paidAt: new Date(),
      });

      const res = await request(app)
        .get(`/api/v1/transaction/${adminTransaction._id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Transaction Creation via Booking", () => {
    it("should create transaction when booking is created", async () => {
      const bookingRes = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          apptDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
          paymentMethod: paymentMethodId,
        });

      expect(bookingRes.statusCode).toBe(200);
      expect(bookingRes.body.success).toBe(true);
      expect(bookingRes.body.data.transaction).toBeDefined();
      expect(bookingRes.body.data.transaction.amount).toBe(
        testCampground.price,
      );
    });

    it("should not create transaction if booking fails", async () => {
      const initialCount = await Transaction.countDocuments();

      const bookingRes = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          apptDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
          paymentMethod: paymentMethodId,
        });

      expect(bookingRes.statusCode).toBe(400);

      const finalCount = await Transaction.countDocuments();
      expect(finalCount).toBe(initialCount);
    });
  });
});