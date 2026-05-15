import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  round_number: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // in minutes
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  questions: [{
    type: { type: String, enum: ['mcq', 'theory', 'code'], required: true },
    question: { type: String, required: true },
    options: [String], // for MCQ
    correct_answer: String, // for MCQ
    test_cases: [{ // for coding questions
      input: String,
      output: String
    }],
    points: { type: Number, default: 1 }
  }],
  show_marks: { type: Boolean, default: false },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });


const Test = mongoose.model("Test", testSchema);
export default Test;
