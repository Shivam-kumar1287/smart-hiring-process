import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createMeeting, getMyMeetings, updateMeetingStatus, getMeetingByLink, saveSignal, clearSignal } from "../controllers/meetingController.js";

const router = express.Router();

router.post("/create", verifyToken, createMeeting);
router.get("/my", verifyToken, getMyMeetings);
router.get("/link/:link", verifyToken, getMeetingByLink);
router.put("/status/:meetingId", verifyToken, updateMeetingStatus);
router.put("/link/:link/signal", verifyToken, saveSignal);
router.delete("/link/:link/signal", verifyToken, clearSignal);

export default router;
