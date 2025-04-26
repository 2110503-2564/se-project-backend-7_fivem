const mongoose = require("mongoose");
const request = require("supertest");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/.env.test" });

const app = require("../server");
const Campground = require("../models/Campground");
const Booking = require("../models/Booking");
const User = require("../models/User");

// Test data
const testCampground = {
  name: "Test Campground",
  address: "123 Test St",
  district: "Test District",
  province: "Test Province",
  postalcode: "12345",
  tel: "0812345678",
  region: "Test Region",
  price: 1000
};

const testAdmin = {
  name: "Test Admin",
  email: "admin@campgroundtest.com",
  tel: "0812345677",
  password: "adminPassword123",
  role: "admin"
};

const testUser = {
  name: "Test User",
  email: "user@campgroundtest.com",
  tel: "0812345679",
  password: "password123",
  role: "user"
};

let adminToken;
let userToken;
let testCampgroundId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Create test admin and get token
  await User.deleteOne({ email: testAdmin.email });
  const admin = await User.create(testAdmin);
  adminToken = admin.getSignedJwtToken();

  // Create test user and get token
  await User.deleteOne({ email: testUser.email });
  const user = await User.create(testUser);
  userToken = user.getSignedJwtToken();
});

beforeEach(async () => {
  // Create a fresh campground before each test that needs it
  await Campground.deleteOne({ name: testCampground.name });
  const campground = await Campground.create(testCampground);
  testCampgroundId = campground._id;
});

afterEach(async () => {
  // Clean up after each test
  await Booking.deleteMany({ campground: testCampgroundId });
  await Campground.deleteOne({ _id: testCampgroundId });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ 
      email: { $in: [testAdmin.email, testUser.email] }
    });
    await mongoose.connection.close();
  }
});

describe("Campground Routes", () => {
  describe("GET /api/v1/campgrounds", () => {
    it("should return all campgrounds with pagination (public)", async () => {
      const res = await request(app)
        .get("/api/v1/campgrounds")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe("POST /api/v1/campgrounds", () => {
    it("should allow admin to create a new campground", async () => {
      const newCampground = {
        ...testCampground,
        name: "New Test Campground"
      };

      const res = await request(app)
        .post("/api/v1/campgrounds")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newCampground)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newCampground.name);
      
      // Clean up
      await Campground.deleteOne({ _id: res.body.data._id });
    });

    it("should prevent regular users from creating campgrounds", async () => {
      const newCampground = {
        ...testCampground,
        name: "User Created Campground"
      };

      const res = await request(app)
        .post("/api/v1/campgrounds")
        .set("Authorization", `Bearer ${userToken}`)
        .send(newCampground)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .post("/api/v1/campgrounds")
        .send(testCampground)
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe("PUT /api/v1/campgrounds/:id", () => {
    it("should update a campground", async () => {
      const updates = { price: 1500 };
      const res = await request(app)
        .put(`/api/v1/campgrounds/${testCampgroundId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(updates.price);
    });
    
  });

  describe("DELETE /api/v1/campgrounds/:id", () => {
    it("should delete a campground and its bookings", async () => {
      // Create a booking for this campground
      const booking = await Booking.create({
        campground: testCampgroundId,
        user: new mongoose.Types.ObjectId(),
        apptDate: new Date()
      });

      const res = await request(app)
        .delete(`/api/v1/campgrounds/${testCampgroundId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify deletion
      const deletedCampground = await Campground.findById(testCampgroundId);
      expect(deletedCampground).toBeNull();

      const deletedBooking = await Booking.findById(booking._id);
      expect(deletedBooking).toBeNull();
    });
  });
});