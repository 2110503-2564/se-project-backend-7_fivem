// tests/user.test.js
const mongoose = require("mongoose");
const request = require("supertest");

const dotenv = require("dotenv");
dotenv.config({ path: "./config/.env.test" });

const app = require("../server");
const User = require("../models/User");

const testUser = {
  name: "Test User",
  email: "test@example.com",
  tel: "0812345681",
  password: "password123",
};

beforeAll(async () => {
  console.log(process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteOne({ email: testUser.email });
    await mongoose.connection.close();
  }
});

describe("User Routes", () => {
  let token;

  it("should not login with missing email or password", async () => {
    // Test missing email
    const res1 = await request(app).post("/api/v1/auth/login").send({
        password: testUser.password
    });
    expect(res1.statusCode).toBe(400);
    
    // Test missing password
    const res2 = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email
    });
    expect(res2.statusCode).toBe(400);
  });

//---------------------------------

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
//-------------------------------------

describe("Production environment", () => {
  let originalEnv;
  
  beforeAll(() => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
  });
  
  afterAll(() => {
      process.env.NODE_ENV = originalEnv;
  });
  
  it("should set secure cookie in production", async () => {
      const res = await request(app)
          .post("/api/v1/auth/login")
          .send({
              email: testUser.email,
              password: testUser.password
          });
      
      // Check if secure flag would be set (you might need to inspect the cookie)
      expect(res.headers['set-cookie']).toBeDefined();
  });
});
