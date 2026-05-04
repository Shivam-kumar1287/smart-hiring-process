import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/smart_job_tracker";

let cached = globalThis.__mongooseConn;

if (!cached) {
  cached = globalThis.__mongooseConn = { conn: null, promise: null };
}

/**
 * Reuses the same Mongoose connection across Vercel serverless invocations
 * and avoids process.exit() on Vercel (which would crash the function).
 */
const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL) || 10,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then(() => mongoose.connection);
  }

  try {
    cached.conn = await cached.promise;
    if (process.env.VERCEL !== "1") {
      console.log(`MongoDB Connected: ${cached.conn.host}`);
    }
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
