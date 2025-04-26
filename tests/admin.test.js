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
  role: "admin"
};

// Regular test user for admin operations
const testUser = {
  name: "User For Admin Test",
  email: "userforadmin@example.com",
  tel: "0812345678",
  password: "userPassword123",
  role: "user"
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  // Create test admin if not exists
  await User.deleteOne({ email: testAdmin.email });
  await User.create(testAdmin);
  
  // Create test user for admin operations
  await User.deleteOne({ email: testUser.email });
  await User.create(testUser);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ 
      email: { $in: [testAdmin.email, testUser.email] }
    });
    await mongoose.connection.close();
  }
});

describe("Admin Authentication", () => {
  let adminToken;
  
  it("should login admin with valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testAdmin.email,
        password: testAdmin.password
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    adminToken = res.body.token;
  });
  
});

describe("Admin User Management", () => {
  let adminToken;
  
  beforeAll(async () => {
    // Login admin to get token
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testAdmin.email,
        password: testAdmin.password
      });
    adminToken = res.body.token;
  });
  
  it("should get all users (admin only)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
  
  it("should get user details by ID (admin only)", async () => {
    const user = await User.findOne({ email: testUser.email });
    
    const res = await request(app)
      .get(`/api/v1/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data.role).toBe("user");
  });
  
  it("should update user role (admin only)", async () => {
    const user = await User.findOne({ email: testUser.email });
    
    const res = await request(app)
      .put(`/api/v1/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "admin" });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toBe("admin");
    
    // Reset role for other tests
    await User.findByIdAndUpdate(user._id, { role: "user" });
  });
  
  it("should delete user (admin only)", async () => {
    // Create temp user to delete
    const tempUser = {
      name: "Temp User",
      email: "temp@example.com",
      tel: "0812345600",
      password: "temp123"
    };
    await User.create(tempUser);
    const user = await User.findOne({ email: tempUser.email });
    
    const res = await request(app)
      .delete(`/api/v1/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
  
  it("should prevent regular users from accessing admin routes", async () => {
    // Login as regular user
    const userRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });
    const userToken = userRes.body.token;
    
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${userToken}`);
    
    expect(res.statusCode).toBe(403);
  });
});

describe("Admin Privilege Verification", () => {
  it("should include admin middleware checks", async () => {
    // Try to access admin route without token
    const res1 = await request(app).get("/api/v1/admin/users");
    expect(res1.statusCode).toBe(401);
    
    // Login as regular user
    const userRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });
    const userToken = userRes.body.token;
    
    // Try to access admin route with user token
    const res2 = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res2.statusCode).toBe(403);
  });
});