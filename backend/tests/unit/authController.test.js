import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../models/userModel.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

const User = (await import("../../models/userModel.js")).default;
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const { login } = await import("../../controllers/authController.js");
describe("Auth Controller - Login Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password: "password123"
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it("should return 400 if email or password is missing", async () => {
    req.body = { email: "test@example.com" };
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith("All fields are required");
  });

  it("should return 404 if user is not found", async () => {
    User.findOne.mockResolvedValue(null);
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith("User not found");
  });

  it("should return 403 if user is not verified", async () => {
    User.findOne.mockResolvedValue({ email: "test@example.com", is_verified: false });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith("Please verify your email first.");
  });

  it("should return 400 if password does not match", async () => {
    User.findOne.mockResolvedValue({ email: "test@example.com", is_verified: true, password: "hashedPassword" });
    bcrypt.compare.mockResolvedValue(false);
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith("Wrong password");
  });

  it("should return 200 and token if login is successful", async () => {
    const mockUser = {
      _id: "userId123",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      is_verified: true,
      password: "hashedPassword"
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mockToken");

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      token: "mockToken",
      user: {
        id: "userId123",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        profile_image: undefined
      }
    });
  });
});
