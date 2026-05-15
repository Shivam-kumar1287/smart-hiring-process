import mongoose from "mongoose";

const testSubmissionSchema = new mongoose.Schema({
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  answers: [{
    question_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: { type: String }, // For MCQ and Theory
    code: { type: String },   // For Coding
    language: { type: String }, // For Coding
    score: { type: Number, default: 0 },
    feedback: { type: String },
    is_correct: { type: Boolean, default: false }
  }],
  tab_switches: { type: Number, default: 0 },
  status: { type: String, enum: ['started', 'submitted', 'cancelled'], default: 'started' },
  total_score: { type: Number, default: 0 },
  max_score: { type: Number, default: 0 },
  started_at: { type: Date, default: Date.now },
  submitted_at: { type: Date }
}, { timestamps: true });

const TestSubmission = mongoose.model("TestSubmission", testSubmissionSchema);
export default TestSubmission;
