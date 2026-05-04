import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'hr', 'admin'], default: 'user' },
  is_verified: { type: Boolean, default: false },
  otp: { type: String },
  otp_expires: { type: Date },
  phone: { type: String },
  location: { type: String },
  bio: { type: String },
  skills: { type: String }, // Can be array of strings if preferred
  social_links: { type: String }, // Usually stored as JSON string in SQL, can be Object in Mongo
  profile_image: { type: String },
}, { timestamps: true });

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model("User", userSchema);
export default User;

