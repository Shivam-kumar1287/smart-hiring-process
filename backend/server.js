import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import mcqRoutes from "./routes/mcqRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import fs from "fs";
import connectDB from "./models/database.js";

const app = express();

// Ensure uploads folder exists locally
if (!process.env.VERCEL && !fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const allowedOrigins = [
  "https://frontend-neldjpkng-shivam-kumars-projects-dc8509b3.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000"
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.startsWith("https://") && origin.endsWith(".vercel.app")) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Fallback manual headers for safety
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Ensure DB is connected before API routes (critical on Vercel serverless)
app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database unavailable:", err);
    res.status(503).json({ error: "Database unavailable", message: err.message });
  }
});

app.get("/api/test", (req, res) => res.json({ message: "API is working" }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/mcq", mcqRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api", healthRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Vercel Fluid / serverless: longer timeout for PDF + LLM routes
export const config = {
  maxDuration: 60,
};

// Export the app for Vercel serverless functions
export default app;

// Listen only when running as a normal Node process (not Vercel serverless)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}