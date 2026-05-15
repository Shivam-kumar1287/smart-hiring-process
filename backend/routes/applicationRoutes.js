import express from "express";
import multer from "multer";
import { applyJob, getApplications, getPendingApplications, getMyApplications, acceptApplication, rejectApplication, getApplicationAnalytics, getApplicationDetails, getApplicationHistory, updateApplicationRound, analyzeResume, promoteCandidate, rejectFromAssessment } from "../controllers/applicationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

// Configure multer for file uploads
const upload = multer({ dest: process.env.VERCEL ? "/tmp/uploads" : "uploads/" });

const router = express.Router();

router.post("/", verifyToken, allowRoles("user"), upload.single("resume"), applyJob);
router.get("/", verifyToken, allowRoles("hr"), getApplications);
router.get("/pending", verifyToken, allowRoles("hr"), getPendingApplications);
router.get("/my", verifyToken, getMyApplications);
router.get("/analytics", verifyToken, allowRoles("hr"), getApplicationAnalytics);
router.get("/history", verifyToken, getApplicationHistory);
router.get("/:id", verifyToken, allowRoles("hr"), getApplicationDetails);
router.put("/:id/accept", verifyToken, allowRoles("hr"), acceptApplication);
router.put("/:id/reject", verifyToken, allowRoles("hr"), rejectApplication);
router.put("/:id/promote", verifyToken, allowRoles("hr"), promoteCandidate);
router.put("/:id/reject-assessment", verifyToken, allowRoles("hr"), rejectFromAssessment);
router.put("/:id/round", verifyToken, allowRoles("hr"), updateApplicationRound);
router.post("/analyze", verifyToken, upload.single("resume"), analyzeResume);

export default router;
