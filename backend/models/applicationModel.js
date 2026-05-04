import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  resume_path: { type: String },
  cover_letter: { type: String },
  ats_score: { type: String },
  ats_explanation: { type: String },
  ats_suggestions: { type: String },
  current_round: { type: String, default: '0' },
  is_offer_sent: { type: Boolean, default: false },
  status: { type: String, enum: ['applied', 'pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

const Application = mongoose.model("Application", applicationSchema);
export default Application;
