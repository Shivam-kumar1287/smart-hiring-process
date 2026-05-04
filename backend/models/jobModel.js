import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  company_name: { type: String, required: true },
  job_role: { type: String, required: true },
  description: { type: String, required: true },
  required_skills: { type: String },
  rounds: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
}, { timestamps: true });

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

const Job = mongoose.model("Job", jobSchema);
export default Job;
