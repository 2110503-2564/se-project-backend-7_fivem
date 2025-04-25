// tests/auth.test.js
const mongoose = require("mongoose");
const request = require("supertest");
const dotenv = require("dotenv");
const app = require("../server");
const Usrer = require("../models/User");

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

  const testUser = {
    name: "Test User",
    email: "test@example.com",
    tel: "0812345678",
    password: "password123",
  };

  it("should register a new user", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(testUser);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should not register with existing email", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(testUser);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should login with valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    token = res.body.token;
  });

  it("should not login with invalid email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "wrong@example.com",
      password: testUser.password,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toBe("Invalid credentials");
  });

  it("should not login with wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: testUser.email,
      password: "wrongpassword",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe("Invalid credentials");
  });

  it("should return current user data with valid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it("should block access to /me without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/not authorize/i);
  });

  it("should logout the user", async () => {
    const res = await request(app).get("/api/v1/auth/logout");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
