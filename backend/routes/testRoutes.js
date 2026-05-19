import express from "express";
import { 
  createTest, 
  getJobTests, 
  startTest, 
  updateTabSwitch, 
  submitAnswer, 
  finalizeSubmission, 
  getSubmissionResults,
  findSubmission,
  getHRSubmissions,
  deleteTest,
  runCodeInteractive
} from "../controllers/testController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// HR Routes
router.post("/", verifyToken, allowRoles("hr"), createTest);
router.delete("/:test_id", verifyToken, allowRoles("hr"), deleteTest);
router.get("/job/:job_id", verifyToken, getJobTests);
router.get("/submissions", verifyToken, allowRoles("hr"), getHRSubmissions);
router.get("/find", verifyToken, findSubmission);


// Candidate Routes
router.post("/run", verifyToken, runCodeInteractive);
router.get("/start/:test_id", verifyToken, startTest);
router.put("/tab-switch/:submissionId", verifyToken, updateTabSwitch);
router.post("/answer/:submissionId", verifyToken, submitAnswer);
router.post("/finalize/:submissionId", verifyToken, finalizeSubmission);
router.get("/results/:submissionId", verifyToken, getSubmissionResults);

export default router;
