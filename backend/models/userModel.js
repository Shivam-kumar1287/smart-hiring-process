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
  hard_skills: { type: [String], default: [] },
  soft_skills: { type: [String], default: [] },
  social_links: { type: Array, default: [] },
  profile_image: { type: String },
  
  // New Profile Fields
  education: [{
    institution: String,
    degree: String,
    board: String,
    marks: String,
    year: String
  }],
  experience: [{
    company: String,
    position: String,
    duration: String,
    description: String
  }],
  projects: [{
    title: String,
    description: String,
    technologies: [String],
    link: String
  }],
  certifications: [{
    title: String,
    organization: String,
    year: String,
    link: String
  }],
  achievements: [{
    title: String,
    description: String
  }],
  custom_sections: [{
    title: String,
    content: String
  }]
}, { timestamps: true });

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model("User", userSchema);
export default User;

