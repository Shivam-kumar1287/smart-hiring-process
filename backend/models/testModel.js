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
      output: String,
      is_hidden: { type: Boolean, default: false }
    }],
    boilerplates: [{ // for coding questions
      language: { type: String, required: true },
      code: { type: String, required: true }
    }],
    points: { type: Number, default: 1 }
  }],
  show_marks: { type: Boolean, default: false },
  proctoring_settings: {
    camera_monitoring: { type: Boolean, default: false },
    microphone_monitoring: { type: Boolean, default: false },
    detect_multiple_persons: { type: Boolean, default: false },
    detect_mobile_phone: { type: Boolean, default: false },
    detect_electronic_devices: { type: Boolean, default: false },
    face_detection: { type: Boolean, default: false },
    look_away_detection: { type: Boolean, default: false },
    random_screenshot: { type: Boolean, default: false },
    screenshot_on_violation: { type: Boolean, default: false },
    tab_switch_detection: { type: Boolean, default: false },
    full_screen_required: { type: Boolean, default: false },
    copy_paste_disabled: { type: Boolean, default: false },
    right_click_disabled: { type: Boolean, default: false },
    max_warnings: { type: Number, default: 3 },
    auto_terminate: { type: Boolean, default: false }
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });


const Test = mongoose.model("Test", testSchema);
export default Test;
