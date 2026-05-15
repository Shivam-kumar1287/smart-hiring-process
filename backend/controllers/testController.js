import Test from "../models/testModel.js";
import TestSubmission from "../models/testSubmissionModel.js";
import Application from "../models/applicationModel.js";
import User from "../models/userModel.js";
import { sendMail } from "../utils/mailer.js";
import { evaluateTheoryAnswer, evaluateCodeAnswer } from "../services/testEvaluationService.js";

export const createTest = async (req, res) => {
  try {
    const { job_id, round_number, title, description, duration, start_time, end_time, questions } = req.body;

    const test = await Test.create({
      job_id,
      round_number,
      title,
      description,
      duration,
      start_time,
      end_time,
      questions,
      created_by: req.user.id
    });

    // Notify accepted candidates for this round
    const applications = await Application.find({ 
      job_id, 
      current_round: round_number.toString(),
      status: 'accepted' 
    }).populate('user_id');

    for (const app of applications) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4F46E5;">New Assessment Assigned</h2>
          <p>Dear ${app.user_id.name},</p>
          <p>A new assessment has been created for your application at <strong>${test.title}</strong>.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
            <p><strong>Title:</strong> ${test.title}</p>
            <p><strong>Start Time:</strong> ${new Date(test.start_time).toLocaleString()}</p>
            <p><strong>End Time:</strong> ${new Date(test.end_time).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${test.duration} minutes</p>
          </div>
          <p>Please log in to the portal during the specified timeframe to complete the test.</p>
          <p>Regards,<br/>Smart Job Tracker Team</p>
        </div>
      `;
      await sendMail(app.user_id.email, `Technical Assessment: ${test.title}`, "", emailHtml);
    }

    res.status(201).json({ message: "Test created and notifications sent", testId: test._id });
  } catch (error) {
    console.error("Create test error:", error);
    res.status(500).json({ error: "Failed to create test" });
  }
};

export const getJobTests = async (req, res) => {
  try {
    const { job_id } = req.params;
    const tests = await Test.find({ job_id }).sort({ round_number: 1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tests" });
  }
};

export const startTest = async (req, res) => {
  try {
    const { test_id } = req.params;
    const user_id = req.user.id;

    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ error: "Test not found" });

    const now = new Date();
    if (now < new Date(test.start_time) || now > new Date(test.end_time)) {
      return res.status(400).json({ error: "Test is not active currently" });
    }

    // Check if already submitted or cancelled
    let submission = await TestSubmission.findOne({ test_id, user_id });
    if (submission && (submission.status === 'submitted' || submission.status === 'cancelled')) {
      return res.status(400).json({ error: "Test already attempted or cancelled" });
    }

    if (!submission) {
      const app = await Application.findOne({ user_id, job_id: test.job_id });
      submission = await TestSubmission.create({
        test_id,
        user_id,
        application_id: app._id,
        max_score: test.questions.reduce((acc, q) => acc + (q.points || 1), 0)
      });
    }

    res.json({ 
      submissionId: submission._id, 
      test: {
        title: test.title,
        duration: test.duration,
        questions: test.questions.map(q => ({
          _id: q._id,
          type: q.type,
          question: q.question,
          options: q.options
        }))
      }
    });
  } catch (error) {
    console.error("Start test error:", error);
    res.status(500).json({ error: "Failed to start test" });
  }
};

export const updateTabSwitch = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await TestSubmission.findById(submissionId);
    
    submission.tab_switches += 1;
    if (submission.tab_switches >= 3) {
      submission.status = 'cancelled';
      await submission.save();
      return res.json({ status: 'cancelled', message: "Test terminated due to multiple tab switches" });
    }

    await submission.save();
    res.json({ tab_switches: submission.tab_switches });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { question_id, answer, code, language } = req.body;

    const submission = await TestSubmission.findById(submissionId).populate('test_id');
    if (submission.status !== 'started') {
      return res.status(400).json({ error: "Test is no longer active" });
    }

    const test = submission.test_id;
    const question = test.questions.id(question_id);

    let score = 0;
    let feedback = "";
    let is_correct = false;

    if (question.type === 'mcq') {
      if (answer === question.correct_answer) {
        score = question.points || 1;
        is_correct = true;
      }
    } else if (question.type === 'theory') {
      const evaluation = await evaluateTheoryAnswer(question.question, answer);
      score = evaluation.score * (question.points || 1);
      feedback = evaluation.feedback;
      is_correct = evaluation.score >= 0.7;
    } else if (question.type === 'code') {
      const evaluation = await evaluateCodeAnswer(question.question, code, language, question.test_cases);
      score = evaluation.score * (question.points || 1);
      feedback = `${evaluation.passed_tests}/${evaluation.total_tests} tests passed. ${evaluation.feedback}`;
      is_correct = evaluation.is_perfect;
    }

    // Update or add answer
    const existingIndex = submission.answers.findIndex(a => a.question_id.toString() === question_id);
    const answerData = { question_id, answer, code, language, score, feedback, is_correct };

    if (existingIndex > -1) {
      submission.answers[existingIndex] = answerData;
    } else {
      submission.answers.push(answerData);
    }

    await submission.save();
    res.json({ message: "Answer saved", is_correct });
  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({ error: "Failed to save answer" });
  }
};

export const finalizeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await TestSubmission.findById(submissionId);
    
    submission.status = 'submitted';
    submission.submitted_at = new Date();
    submission.total_score = submission.answers.reduce((acc, a) => acc + a.score, 0);
    
    await submission.save();
    res.json({ message: "Test submitted successfully", total_score: submission.total_score });
  } catch (error) {
    res.status(500).json({ error: "Finalization failed" });
  }
};

export const getSubmissionResults = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await TestSubmission.findById(submissionId).populate('test_id user_id');
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch results" });
  }
};

export const findSubmission = async (req, res) => {
  try {
    const { test_id, user_id } = req.query;
    const submission = await TestSubmission.findOne({ test_id, user_id });
    if (!submission) return res.status(404).json({ error: "No submission found" });
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: "Error searching submission" });
  }
};
