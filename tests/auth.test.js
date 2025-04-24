// tests/auth.test.js
const mongoose = require("mongoose");
const request = require("supertest");
const dotenv = require("dotenv");
const app = require("../server");

dotenv.config({ path: "./config/.env.test" });

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }
});

describe("Auth Routes", () => {
  let token;

  it("should register a new user", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      tel: "0812345678",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should login with valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    token = res.body.token; // สำหรับใช้ใน getMe
  });

  it("should get current logged in user", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("test@example.com");
  });

  it("should logout the user", async () => {
    const res = await request(app).get("/api/v1/auth/logout");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
