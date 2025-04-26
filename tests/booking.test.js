require("dotenv").config({ path: "./config/.env.test" });
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server"); // adjust path if needed
const User = require("../models/User");
const Campground = require("../models/Campground");
const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");
const PaymentMethod = require("../models/PaymentMethod");

let userToken,
  adminToken,
  userId,
  adminId,
  campgroundId,
  testBookingId,
  paymentMethodId;

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Clean up any test users
  await User.deleteMany({
    email: { $in: ["user@test.com", "admin@test.com", "other@test.com"] },
  });
  // Clean up any test campgrounds
  await Campground.deleteMany({ name: "Test Campground" });
  // Clean up any related bookings/transactions
  await Booking.deleteMany({});
  await Transaction.deleteMany({});
  await PaymentMethod.deleteMany({});

  // Create a normal user
  const userRes = await request(app).post("/api/v1/auth/register").send({
    name: "Test User",
    email: "user@test.com",
    tel: "0812345678",
    password: "password123",
    role: "user",
  });
  userToken = userRes.body.token;
  userId = userRes.body.data.id;

  // Create an admin user
  const adminRes = await request(app).post("/api/v1/auth/register").send({
    name: "Admin User",
    email: "admin@test.com",
    tel: "0812345679",
    password: "password123",
    role: "admin",
  });
  adminToken = adminRes.body.token;
  adminId = adminRes.body.data._id;

  // Create a campground for bookings
  const camp = await Campground.create({
    name: "Test Campground",
    province: "TestProvince",
    region: "TestRegion",
    postalcode: "12345",
    district: "TestDistrict",
    address: "123 Test St",
    tel: "0102030405",
    price: 100,
  });
  campgroundId = camp._id.toString();

  // Create a payment method via API
  const pmRes = await request(app)
    .post("/api/v1/paymentmethod")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      method: "credit_card",
      name: "C000",
      cardNumber: "4111111111111111",
    });
  paymentMethodId = pmRes.body.data._id;
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  // Cleanup test data
  await Booking.deleteMany({});
  await Transaction.deleteMany({});
  await Campground.deleteMany({});
  await User.deleteMany({});
  await PaymentMethod.deleteMany({});

  await mongoose.connection.close();
});

describe("Booking API", () => {
  describe("POST /api/v1/campgrounds/:campgroundId/bookings", () => {
    it("should handle database error when creating booking", async () => {
      // Mock the Booking.create method to throw an error
      const createSpy = jest
        .spyOn(Booking, "create")
        .mockRejectedValue(new Error("Simulated database failure"));

      // Mock console.log to verify it's called
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const res = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          apptDate: new Date(Date.now() + 86400000).toISOString(),
          paymentMethod: paymentMethodId,
        });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        message: "Cannot create Booking",
      });
      expect(consoleSpy).toHaveBeenCalled();

      // Restore the original implementations
      createSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it("should fail when missing paymentMethod", async () => {
      const res = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ apptDate: new Date(Date.now() + 86400000).toISOString() });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Payment method is required");
    });

    it("should fail when No Campground with the id", async () => {
      const res = await request(app)
        .post(`/api/v1/campgrounds/000000000000000000000000/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ apptDate: new Date(Date.now() + 86400000).toISOString() });

      console.log(res.body);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        "No Campground with the id of " + "000000000000000000000000",
      );
    });

    it("should fail when booking a past date", async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const res = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ apptDate: past, paymentMethod: "credit_card" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Cannot book a past date");
    });

    it("should limit normal users to 3 bookings", async () => {
      for (let i = 1; i <= 3; i++) {
        const res = await request(app)
          .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
          .set("Authorization", `Bearer ${userToken}`)
          .send({
            apptDate: new Date(Date.now() + i * 86400000).toISOString(),
            paymentMethod: paymentMethodId,
          });
        expect(res.status).toBe(200);
      }
      const res4 = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          apptDate: new Date(Date.now() + 4 * 86400000).toISOString(),
          paymentMethod: paymentMethodId,
        });
      expect(res4.status).toBe(400);
      expect(res4.body.message).toMatch(/has only made 3 bookings/);

      await Booking.deleteMany({});
    });

    it("should create booking and transaction for admin user without limit", async () => {
      const res = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          apptDate: new Date(Date.now() + 86400000).toISOString(),
          paymentMethod: paymentMethodId,
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { booking, transaction } = res.body.data;
      expect(booking).toHaveProperty("_id");
      expect(transaction).toHaveProperty("_id");
      testBookingId = booking._id;
    });
  });

  describe("GET /api/v1/bookings", () => {
    it("user should see only own bookings", async () => {
      const res = await request(app)
        .get("/api/v1/bookings")
        .set("Authorization", `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((b) => b.user === userId)).toBe(true);
    });

    it("should hit the catch block and return 500 when query fails", async () => {
      const findSpy = jest.spyOn(Booking, "find").mockImplementation(() => ({
        populate: jest
          .fn()
          .mockRejectedValue(new Error("Simulated database failure")),
      }));

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const res = await request(app)
        .get("/api/v1/bookings")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        message: "Cannot find Booking",
      });

      expect(consoleSpy).toHaveBeenCalled(); // ต้องมาตรงนี้หลัง request เสร็จ!

      findSpy.mockRestore();
      consoleSpy.mockRestore();
    }, 10000);

    it("admin should see all bookings", async () => {
      const res = await request(app)
        .get("/api/v1/bookings")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it("admin can filter by campgroundId", async () => {
      const res = await request(app)
        .get(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((b) => b.campground._id === campgroundId));
    });

    it("non-admin filtering by campgroundId still returns own bookings only", async () => {
      const res = await request(app)
        .get(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((b) => b.user === userId)).toBe(true);
    });
  });

  describe("GET /api/v1/bookings/:id", () => {
    it("should return 404 for non-existent id", async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/00000000000000000000000`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(500);
    });

    it("should return 500 when no booking is found", async () => {
      const findByIdSpy = jest
        .spyOn(Booking, "findById")
        .mockResolvedValue(null);

      const nonExistentId = "000000000000000000000000";
      const res = await request(app)
        .get(`/api/v1/bookings/${nonExistentId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        message: "Cannot find Booking", // Changed to match controller
      });

      findByIdSpy.mockRestore();
    });

    it("should retrieve a specific booking", async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("_id", testBookingId);
    });
  });

  describe("PUT /api/v1/bookings/:id", () => {
    it("should update own booking", async () => {
      const newDate = new Date(Date.now() + 2 * 86400000).toISOString();
      const res = await request(app)
        .put(`/api/v1/bookings/${testBookingId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ apptDate: newDate });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("apptDate");
    });

    it("should return 404 when no booking exists", async () => {
      const nonExistentId = "000000000000000000000000";
      const res = await request(app)
        .put(`/api/v1/bookings/${nonExistentId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ apptDate: new Date().toISOString() });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        message: `No Booking with the id of ${nonExistentId}`,
      });
    });

    it("should handle database errors when updating", async () => {
      // First create a booking to update
      const booking = await Booking.create({
        user: userId,
        campground: campgroundId,
        apptDate: new Date(Date.now() + 86400000),
        paymentMethod: paymentMethodId,
      });

      // Mock findByIdAndUpdate to throw an error
      const updateSpy = jest
        .spyOn(Booking, "findByIdAndUpdate")
        .mockRejectedValue(new Error("Simulated database error"));

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const res = await request(app)
        .put(`/api/v1/bookings/${booking._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ apptDate: new Date().toISOString() });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        message: "Cannot update Booking",
      });
      expect(consoleSpy).toHaveBeenCalled();

      // Clean up
      updateSpy.mockRestore();
      consoleSpy.mockRestore();
      await Booking.findByIdAndDelete(booking._id);
    });

    it("non-owner should not update another booking", async () => {
      // Create a second normal user
      const otherRes = await request(app).post("/api/v1/auth/register").send({
        name: "Other User",
        email: "other@test.com",
        tel: "0812340000",
        password: "pass123",
        role: "user",
      });
      const otherToken = otherRes.body.token;
      const res = await request(app)
        .put(`/api/v1/bookings/${testBookingId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ apptDate: new Date(Date.now() + 3 * 86400000).toISOString() });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/v1/bookings/:id", () => {
    it("user should delete own booking", async () => {
      // create a booking for delete test
      const dRes = await request(app)
        .post(`/api/v1/campgrounds/${campgroundId}/bookings`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          apptDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          paymentMethod: paymentMethodId,
        });

      const bid = dRes.body.data.booking._id;
      const res = await request(app)
        .delete(`/api/v1/bookings/${bid}`)
        .set("Authorization", `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("admin should delete any booking", async () => {
      // admin deletes the booking created earlier
      const res = await request(app)
        .delete(`/api/v1/bookings/${testBookingId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 404 on deleting non-existent booking", async () => {
      const res = await request(app)
        .delete("/api/v1/bookings/000000000000000000000000")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it("should handle database errors during deletion", async () => {
      // Mock deleteOne to throw an error

      let testBooking = await Booking.create({
        user: userId,
        campground: campgroundId,
        apptDate: new Date(Date.now() + 86400000),
        paymentMethod: paymentMethodId,
      });

      const deleteSpy = jest
        .spyOn(Booking.prototype, "deleteOne")
        .mockRejectedValue(new Error("Simulated deletion error"));

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const res = await request(app)
        .delete(`/api/v1/bookings/${testBooking._id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        message: "Cannot delete Booking",
      });
      expect(consoleSpy).toHaveBeenCalled();

      deleteSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it("should prevent non-owner/non-admin from deleting booking", async () => {
      // Create test booking
      const testBooking = await Booking.create({
        user: userId,
        campground: campgroundId,
        apptDate: new Date(Date.now() + 86400000),
        paymentMethod: paymentMethodId,
      });

      // Register new user and get their ID
      const otherUserRes = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Other User",
          email: "other@test.com",
          tel: "0812340000",
          password: "password123",
          role: "user",
        });

      // Extract the new user's ID from the response
      const otherUserId = otherUserRes.body._id; // Adjust this based on your actual response structure
      otherUserToken = otherUserRes.body.token;

      // Attempt to delete with other user's token
      const res = await request(app)
        .delete(`/api/v1/bookings/${testBooking._id}`)
        .set("Authorization", `Bearer ${otherUserToken}`);

      // Verify response
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        msg: "Not authorize to access this route",
      });

      // Cleanup
      await Booking.findByIdAndDelete(testBooking._id);
      await User.findByIdAndDelete(otherUserId);
    });
  });
});
