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
  price: 1000,
};

const testAdmin = {
  name: "Test Admin",
  email: "admin@campgroundtest.com",
  tel: "0812345677",
  password: "adminPassword123",
  role: "admin",
};

const testUser = {
  name: "Test User",
  email: "user@campgroundtest.com",
  tel: "0812345678",
  password: "UserPassword123",
  role: "user",
}

let adminToken;
let userToken

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Clean up existing test admin if exists
  await User.deleteOne({ email: testAdmin.email });
  await User.deleteOne({ email: testUser.email});

  // Create test admin and get token
  const admin = await User.create(testAdmin);
  const user = await User.create(testUser);
  adminToken = admin.getSignedJwtToken();
  userToken = user.getSignedJwtToken();
});

afterAll(async () => {
  // Clean up test admin
  await User.deleteOne({ email: testAdmin.email });
  await User.deleteOne({ email: testUser.email });

  await mongoose.connection.close();
});

describe("Campground Controller", () => {
  let campgroundIds = [];
  let bookingIds = [];

  afterEach(async () => {
    // Delete bookings created during tests
    if (bookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: bookingIds } });
      bookingIds = [];
    }

    // Delete campgrounds created during tests
    if (campgroundIds.length > 0) {
      await Campground.deleteMany({ _id: { $in: campgroundIds } });
      campgroundIds = [];
    }
  });

  describe("getCampgrounds", () => {
    beforeEach(async () => {
      const campground = await Campground.create(testCampground);
      campgroundIds.push(campground._id);
    });

    it("should get all campgrounds with default pagination", async () => {
      const res = await request(app).get("/api/v1/campgrounds").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should handle select fields", async () => {
      const res = await request(app)
        .get("/api/v1/campgrounds?select=name,address")
        .expect(200);

      expect(res.body.data[0].name).toBeDefined();
      expect(res.body.data[0].address).toBeDefined();
      expect(res.body.data[0].price).toBeUndefined();
    });

    it("should handle sorting", async () => {
      const anotherCampground = await Campground.create({
        ...testCampground,
        name: "Another Campground",
        price: 500,
      });
      campgroundIds.push(anotherCampground._id);

      const res = await request(app)
        .get("/api/v1/campgrounds?sort=price")
        .expect(200);

      expect(res.body.data[0].price).toBe(500);
    });

    it("should handle pagination", async () => {
      // Create multiple campgrounds for pagination testing
      for (let i = 0; i < 30; i++) {
        const campground = await Campground.create({
          ...testCampground,
          name: `Campground ${i}`,
        });
        campgroundIds.push(campground._id);
      }

      const res = await request(app)
        .get("/api/v1/campgrounds?page=2&limit=10")
        .expect(200);

      expect(res.body.pagination).toBeDefined();
      expect(res.body.data.length).toBe(10);
    });

    it("should handle errors", async () => {
      // Force an error by passing invalid query parameters
      const res = await request(app)
        .get("/api/v1/campgrounds?price[gt]=notanumber")
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe("getCampground", () => {
    let testCampgroundId;

    beforeEach(async () => {
      const campground = await Campground.create(testCampground);
      testCampgroundId = campground._id;
      campgroundIds.push(testCampgroundId);
    });

    it("should get a single campground with bookings", async () => {
      // Create a booking for this campground
      const booking = await Booking.create({
        campground: testCampgroundId,
        user: new mongoose.Types.ObjectId(),
        apptDate: new Date(),
      });
      bookingIds.push(booking._id);

      const res = await request(app)
        .get(`/api/v1/campgrounds/${testCampgroundId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings.length).toBe(1);
    });

    it("should return 400 for invalid ID", async () => {
      const res = await request(app)
        .get("/api/v1/campgrounds/invalidid")
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 400 for non-existent campground", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/campgrounds/${fakeId}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe("createCampground", () => {
    it("should create a new campground", async () => {
      const res = await request(app)
        .post("/api/v1/campgrounds")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(testCampground)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testCampground.name);

      campgroundIds.push(res.body.data._id);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .post("/api/v1/campgrounds")
        .send(testCampground)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it("should return 403 for unauthorized access from user", async () => {
      const res = await request(app)
        .post("/api/v1/campgrounds")
        .set("Authorization", `Bearer ${userToken}`)
        .send(testCampground)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("updateCampground", () => {
    let testCampgroundId;

    beforeEach(async () => {
      const campground = await Campground.create(testCampground);
      testCampgroundId = campground._id;
      campgroundIds.push(testCampgroundId);
    });

    it("should update a campground", async () => {
      const updates = { price: 1500 };
      const res = await request(app)
        .put(`/api/v1/campgrounds/${testCampgroundId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(1500);
    });

    it("should handle errors during update", async () => {
      // Force an error by passing an invalid ID format
      const res = await request(app)
        .put("/api/v1/campgrounds/invalidid")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 400 for non-existent campground", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/campgrounds/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ price: 1500 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe("deleteCampground", () => {
    let testCampgroundId;

    beforeEach(async () => {
      const campground = await Campground.create(testCampground);
      testCampgroundId = campground._id;
      campgroundIds.push(testCampgroundId);
    });

    it("should delete a campground and its bookings", async () => {
      // Create a booking for this campground
      const booking = await Booking.create({
        campground: testCampgroundId,
        user: new mongoose.Types.ObjectId(),
        apptDate: new Date(),
      });
      bookingIds.push(booking._id);

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

    it("should return 404 for non-existent campground", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/campgrounds/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it("should handle errors during deletion", async () => {
      // Force an error by passing an invalid ID format
      const res = await request(app)
        .delete("/api/v1/campgrounds/invalidid")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
