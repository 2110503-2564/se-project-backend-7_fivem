const request = require("supertest");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("../server");
const User = require("../models/User");
const Booking = require("../models/Booking");

dotenv.config({ path: "./config/.env.test" });

let token;
let bookingId;
let campgroundId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Create campground
  const Campground = require("../models/Campground");
  const campground = await Campground.create({
    name: "Test Campground",
    location: "Anywhere",
    price: 1000,
    description: "Nice camp",
    region: "ภาคกลาง",
    province: "กรุงเทพมหานคร",
    district: "เขตปทุมวัน",
    postalcode: "10330",
    address: "ถนนพญาไท",
  });
  campgroundId = campground._id;

  // Register user
  await request(app).post("/api/v1/auth/register").send({
    name: "Booking Tester",
    email: "booking@example.com",
    tel: "0891234567",
    password: "test1234",
  });

  // Login
  const res = await request(app).post("/api/v1/auth/login").send({
    email: "booking@example.com",
    password: "test1234",
  });

  token = res.body.token;
});

afterAll(async () => {
  try {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  } catch (err) {
    console.error("Failed to cleanup DB:", err);
  }
});

describe("Bookings CRUD", () => {
  it("should block GET /bookings without token", async () => {
    const res = await request(app).get("/api/v1/bookings");
    expect(res.statusCode).toBe(401);
  });

  it("should create a new booking", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        campground: campgroundId,
        date: "2025-12-01",
        nights: 2,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("_id");
    bookingId = res.body.data._id;
  });

  it("should get all bookings", async () => {
    const res = await request(app)
      .get("/api/v1/bookings")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should update booking", async () => {
    const res = await request(app)
      .put(`/api/v1/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nights: 3 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.nights).toBe(3);
  });

  it("should delete booking", async () => {
    const res = await request(app)
      .delete(`/api/v1/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
