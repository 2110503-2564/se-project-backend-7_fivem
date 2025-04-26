const mongoose = require("mongoose");
const request = require("supertest");

const dotenv = require("dotenv");
dotenv.config({ path: "./config/.env.test" });

const app = require("../server");
const User = require("../models/User");

// Admin test user
const testAdmin = {
  name: "Test Admin",
  email: "admin@example.com",
  tel: "0812345679",
  password: "adminPassword123",
  role: "admin",
};

// Regular test user for admin operations
const testUser = {
  name: "User For Admin Test",
  email: "userforadmin@example.com",
  tel: "0812345678",
  password: "userPassword123",
  role: "user",
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await User.deleteOne({ email: testAdmin.email });
  await User.deleteOne({ email: testUser.email });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({
      email: { $in: [testAdmin.email, testUser.email] },
    });
    await mongoose.connection.close();
  }
});

describe("Admin Authentication", () => {
  let adminToken;

  it("should register admin ", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(testAdmin);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    adminToken = res.body.token;
  });

  it("should login admin ", async () => {
    const res = await request(app).post("/api/v1/auth/login").send(testAdmin);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    adminToken = res.body.token;
  });
});
