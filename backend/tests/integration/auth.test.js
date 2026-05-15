import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../../server.js";
import User from "../../models/userModel.js";
import bcrypt from "bcryptjs";

let mongoServer;

beforeAll(async () => {
  // Use a different DB name for tests
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Close existing connection if any (from server.js import)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Auth Integration Tests", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should register a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "user"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("OTP sent");
    
    const user = await User.findOne({ email: "test@example.com" });
    expect(user).toBeDefined();
    expect(user.is_verified).toBe(false);
  });

  it("should login a verified user", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    await User.create({
      name: "Verified User",
      email: "verified@example.com",
      password: hashedPassword,
      role: "user",
      is_verified: true
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "verified@example.com",
        password: "password123"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("verified@example.com");
  });

  it("should not login an unverified user", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    await User.create({
      name: "Unverified User",
      email: "unverified@example.com",
      password: hashedPassword,
      role: "user",
      is_verified: false
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "unverified@example.com",
        password: "password123"
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toBe("Please verify your email first.");
  });
});
