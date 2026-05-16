import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  hr_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  scheduled_at: { type: Date, required: true },
  duration: { type: Number, default: 30 }, // in minutes
  type: { type: String, enum: ['audio', 'video', 'both'], default: 'both' },
  status: { type: String, enum: ['scheduled', 'accepted', 'rejected', 'reschedule_requested', 'completed', 'cancelled'], default: 'scheduled' },
  meeting_link: { type: String },
  candidate_response: {
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'reschedule'], default: 'pending' },
    message: { type: String }
  },
  notes: { type: String },
  is_instant: { type: Boolean, default: false },
  offer: { type: String },
  answer: { type: String },
  callerCandidates: [{ type: String }],
  calleeCandidates: [{ type: String }]
}, { timestamps: true });

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;
