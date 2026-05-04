import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart_job_tracker");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// For backward compatibility during migration, we can export a dummy db object 
// or just export the connect function.
// Since existing controllers use db.query, we will need to refactor them.
export default connectDB;

