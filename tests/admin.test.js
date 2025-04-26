const mongoose = require("mongoose");
const request = require("supertest");

const dotenv = require("dotenv");
dotenv.config({ path: "./config/.env.test" });

const app = require("../server");
const User = require("../models/User");

const testAdmin = {
  name: "adminTest",
  email: "adminTest@gmail.com",
  tel: "0812345682",
  password: "1234567890",
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

AfterAll(async () => {
  if (mongoose.connections.readyState === 1) {
    await User.deleteOne({ email: testAdmin.email });
    await mongoose.connection.close();
  }
});

desecribe("Admin Routes", () => {
  let token;

  it("should register a new admin", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(testAdmin);

    console.log(res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });
});
