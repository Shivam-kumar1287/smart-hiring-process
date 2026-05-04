import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
  reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'closed'], default: 'pending' },
}, { timestamps: true });

issueSchema.set('toJSON', { virtuals: true });
issueSchema.set('toObject', { virtuals: true });

const Issue = mongoose.model("Issue", issueSchema);
export default Issue;
