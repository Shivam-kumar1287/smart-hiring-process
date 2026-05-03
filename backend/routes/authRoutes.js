import express from "express";
import multer from "multer";
import { register, login, getProfile, updateProfile, updateProfileImage, verifyRegisterOTP, forgotPassword, resetPassword } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const upload = multer({ dest: process.env.VERCEL ? "/tmp/uploads" : "uploads/" });
const router = express.Router();

router.post("/register", register);
router.post("/verify-register", verifyRegisterOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.post("/profile/image", verifyToken, upload.single("image"), updateProfileImage);

export default router;