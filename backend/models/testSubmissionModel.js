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
    is_correct: { type: Boolean, default: false },
    cases: [{
      input: String,
      expected: String,
      actual: String,
      passed: Boolean,
      status: String,
      error: String,
      is_hidden: { type: Boolean, default: false }
    }]
  }],
  tab_switches: { type: Number, default: 0 },
  status: { type: String, enum: ['started', 'submitted', 'cancelled'], default: 'started' },
  warnings_count: { type: Number, default: 0 },
  proctoring_violations: [{
    timestamp: { type: Date, default: Date.now },
    violation_type: { type: String },
    screenshot_path: { type: String },
    action: { type: String }
  }],
  proctoring_screenshots: [{
    timestamp: { type: Date, default: Date.now },
    screenshot_path: { type: String },
    trigger: { type: String } // 'random' or 'violation'
  }],
  total_score: { type: Number, default: 0 },
  max_score: { type: Number, default: 0 },
  started_at: { type: Date, default: Date.now },
  submitted_at: { type: Date }
}, { timestamps: true });

const TestSubmission = mongoose.model("TestSubmission", testSubmissionSchema);
export default TestSubmission;
