import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateOTP } from "../utils/otp.js";
import { sendMail } from "../utils/mailer.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json("All fields are required");
    }

    const hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    try {
      await User.create({
        name,
        email,
        password: hash,
        role: role || "user",
        is_verified: false,
        otp,
        otp_expires
      });
    } catch (error) {
      if (error.code === 11000) { // MongoDB duplicate key error
        // If email exists but not verified, update OTP
        const existing = await User.findOne({ email });
        if (existing && !existing.is_verified) {
          existing.name = name;
          existing.password = hash;
          existing.role = role || "user";
          existing.otp = otp;
          existing.otp_expires = otp_expires;
          await existing.save();
        } else {
          return res.status(400).json("Email already exists and is verified");
        }
      } else {
        throw error;
      }
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Dear User,</p>
        <p>We received a request to register an account with us.</p>
        <p>Your One-Time Password (OTP) is: <strong style="font-size: 1.2em; color: #4F46E5;">${otp}</strong></p>
        <p>This OTP is valid for <strong>10 minutes</strong>. Please use it within this time frame to proceed with completing your registration.</p>
        <p>For security reasons, do not share this OTP with anyone. If you did not request an account registration, please ignore this email or contact our support team immediately.</p>
        <p>Thank you,<br/>Support Team<br/>Smart Job Tracker</p>
      </div>
    `;

    await sendMail(email, "Registration OTP - Smart Job Tracker", "", emailHtml);

    res.json({ message: "OTP sent to your email. Please verify to complete registration.", requiresOtp: true, email });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json("Registration failed");
  }
};

export const verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json("Email and OTP required");

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("User not found");

    if (user.is_verified) return res.status(400).json("User already verified");

    if (user.otp !== otp || new Date() > new Date(user.otp_expires)) {
      return res.status(400).json("Invalid or expired OTP");
    }

    user.is_verified = true;
    user.otp = null;
    user.otp_expires = null;
    await user.save();
    
    res.json({ message: "Registration successful. You can now log in." });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json("Verification failed");
  }
};

export const login = async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json("All fields are required");
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("User not found");

    if (!user.is_verified) return res.status(403).json("Please verify your email first.");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json("Wrong password");

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ 
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json("Login failed");
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json("Email is required");

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("User not found");

    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otp_expires = otp_expires;
    await user.save();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Dear User,</p>
        <p>We received a request to reset your account password.</p>
        <p>Your One-Time Password (OTP) is: <strong style="font-size: 1.2em; color: #4F46E5;">${otp}</strong></p>
        <p>This OTP is valid for <strong>10 minutes</strong>. Please use it within this time frame to proceed with resetting your password.</p>
        <p>For security reasons, do not share this OTP with anyone. If you did not request a password reset, please ignore this email or contact our support team immediately.</p>
        <p>Thank you,<br/>Support Team<br/>Smart Job Tracker</p>
      </div>
    `;

    await sendMail(email, "Password Reset OTP - Smart Job Tracker", "", emailHtml);

    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json("Failed to process request");
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json("All fields required");

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("User not found");

    if (user.otp !== otp || new Date() > new Date(user.otp_expires)) {
      return res.status(400).json("Invalid or expired OTP");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    user.otp = null;
    user.otp_expires = null;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json("Failed to reset password");
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json("User not found");
    }
    
    // Map _id to id if necessary for frontend, though User.findById(id) works.
    const userObj = user.toObject();
    userObj.id = userObj._id;
    
    res.json(userObj);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json("Error fetching profile");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, bio, skills, social_links } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, {
      name,
      phone,
      location,
      bio,
      skills,
      social_links: typeof social_links === 'string' ? social_links : JSON.stringify(social_links)
    });
    
    res.json("Profile updated successfully");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json("Error updating profile");
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json("No image uploaded");
    }

    const imagePath = req.file.path;
    
    await User.findByIdAndUpdate(req.user.id, { profile_image: imagePath });

    res.json({ message: "Profile image updated successfully", imagePath });
  } catch (error) {
    console.error("Error updating profile image:", error);
    res.status(500).json("Error updating profile image");
  }
};