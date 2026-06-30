import Test from "../models/testModel.js";
import TestSubmission from "../models/testSubmissionModel.js";
import Application from "../models/applicationModel.js";
import User from "../models/userModel.js";
import Job from "../models/jobModel.js";
import { sendMail } from "../utils/mailer.js";
import mongoose from "mongoose";
import axios from "axios";
import { evaluateTheoryAnswer, evaluateCodeAnswer } from "../services/testEvaluationService.js";
import { generateAIContent, generateAITestCases } from "../services/boilerplateService.js";

export const createTest = async (req, res) => {
  try {
    const { job_id, round_number, title, description, duration, start_time, end_time, show_marks, questions } = req.body;

    const existingTest = await Test.findOne({ job_id, round_number });
    if (existingTest) {
      return res.status(400).json({ error: `A test for Round ${round_number} already exists for this job.` });
    }

    const test = await Test.create({
      job_id,
      round_number,
      title,
      description,
      duration,
      start_time,
      end_time,
      show_marks,
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
    if (process.env.NODE_ENV === 'production' && (now < new Date(test.start_time) || now > new Date(test.end_time))) {
      return res.status(400).json({ error: "Test is not active currently" });
    } else if (now < new Date(test.start_time) || now > new Date(test.end_time)) {
      console.log(`[DEV MODE] Bypassing active time window check for test: ${test.title}`);
    }

    // Check if already submitted or cancelled
    let submission = await TestSubmission.findOne({ test_id, user_id });
    if (submission && (submission.status === 'submitted' || submission.status === 'cancelled')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV MODE] Deleting existing submitted/cancelled submission ${submission._id} to allow re-testing.`);
        await TestSubmission.deleteOne({ _id: submission._id });
        submission = null;
      } else {
        return res.status(400).json({ error: "Test already attempted or cancelled" });
      }
    }

    if (!submission) {
      const app = await Application.findOne({ user_id, job_id: test.job_id });
      
      if (!app || app.status !== 'accepted') {
        return res.status(403).json({ error: "Only accepted candidates can take this test" });
      }

      const isCorrectRound = (app.current_round.toString() === test.round_number.toString()) || 
                             (app.current_round.toString() === "0" && test.round_number === 1);

      if (!isCorrectRound) {
        return res.status(403).json({ error: "You are not in the correct round for this test" });
      }

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
        show_marks: test.show_marks,
        questions: test.questions.map(q => ({
          _id: q._id,
          type: q.type,
          question: q.question,
          options: q.options,
          test_cases: q.test_cases ? q.test_cases.map(tc => {
            if (tc.is_hidden) {
              return { _id: tc._id, is_hidden: true };
            }
            return { _id: tc._id, input: tc.input, output: tc.output, is_hidden: false };
          }) : [],
          boilerplates: q.boilerplates || []
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
    if (submission.tab_switches >= 2) {
      submission.status = 'cancelled';
      await submission.save();
      return res.json({ terminated: true, message: "Test terminated due to multiple tab switches" });
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
    let cases = [];

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
      cases = evaluation.cases || [];
    }

    // Update or add answer
    const existingIndex = submission.answers.findIndex(a => a.question_id.toString() === question_id);
    const answerData = { question_id, answer, code, language, score, feedback, is_correct };
    if (question.type === 'code') {
      answerData.cases = cases;
    }

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
    const submission = await TestSubmission.findById(submissionId)
      .populate('test_id user_id')
      .populate({
        path: 'test_id',
        populate: { path: 'job_id', select: 'title' }
      });
    
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    // Determine if user is HR or Admin
    const isHrOrAdmin = req.user && (req.user.role === 'hr' || req.user.role === 'admin');

    const sanitizedSubmission = submission.toObject();

    // Redact hidden test case details for regular candidates
    if (!isHrOrAdmin) {
      sanitizedSubmission.answers = sanitizedSubmission.answers.map(ans => {
        if (ans.cases) {
          ans.cases = ans.cases.map(c => {
            if (c.is_hidden) {
              return {
                passed: c.passed,
                status: c.status,
                is_hidden: true,
                input: "[Hidden Test Case]",
                expected: "[Hidden Test Case]",
                actual: c.passed ? "[Output matches expected]" : "[Output differs or failed]",
                error: c.error ? "Execution failed" : null
              };
            }
            return c;
          });
        }
        return ans;
      });
    }

    res.json(sanitizedSubmission);
  } catch (error) {
    console.error("Error fetching submission results:", error);
    res.status(500).json({ error: "Failed to fetch results" });
  }
};

export const findSubmission = async (req, res) => {
  try {
    const { test_id, user_id } = req.query;
    if (!mongoose.Types.ObjectId.isValid(test_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    const submission = await TestSubmission.findOne({ test_id, user_id });
    if (!submission) return res.json(null);
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: "Error searching submission" });
  }
};

export const getHRSubmissions = async (req, res) => {
  try {
    const hrId = req.user.id;
    
    // Find all jobs by this HR
    const jobs = await Job.find({ created_by: hrId });
    const jobIds = jobs.map(j => j._id);

    // Find all tests for these jobs
    const tests = await Test.find({ job_id: { $in: jobIds } });
    const testIds = tests.map(t => t._id);

    // Find all submissions for these tests
    const submissions = await TestSubmission.find({ test_id: { $in: testIds } })
      .populate('user_id', 'name email profile_image')
      .populate('test_id', 'title round_number')
      .sort({ submitted_at: -1 });

    res.json(submissions);
  } catch (error) {
    console.error("Error fetching HR submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};
export const deleteTest = async (req, res) => {
  try {
    const { test_id } = req.params;
    await Test.findByIdAndDelete(test_id);
    // Optionally delete all submissions for this test too
    await TestSubmission.deleteMany({ test_id });
    res.json({ message: "Test deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete test" });
  }
};

export const runCodeInteractive = async (req, res) => {
  try {
    const { code, language, test_cases } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });
    if (!test_cases || !Array.isArray(test_cases)) return res.status(400).json({ error: "Test cases are required" });

    // Re-use evaluateCodeAnswer to run the code on the provided test cases
    const evaluation = await evaluateCodeAnswer(null, code, language, test_cases);

    res.json({
      passed: evaluation.passed_tests,
      total: evaluation.total_tests,
      cases: evaluation.cases
    });
  } catch (error) {
    console.error("Run code error:", error);
    res.status(500).json({ error: "Code execution failed" });
  }
};

export const generateAIBoilerplates = async (req, res) => {
  try {
    const { question, existingBoilerplate, existingLanguage } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question description is required" });
    }
    const boilerplates = await generateAIContent(question, existingBoilerplate, existingLanguage);
    res.json(boilerplates);
  } catch (error) {
    console.error("Generate AI Boilerplates error:", error);
    res.status(500).json({ error: "Failed to generate boilerplates: " + error.message });
  }
};

export const generateAITestCasesController = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question description is required" });
    }
    const testCases = await generateAITestCases(question);
    res.json(testCases);
  } catch (error) {
    console.error("Generate AI Testcases error:", error);
    res.status(500).json({ error: "Failed to generate test cases: " + error.message });
  }
};

export const runCustomCode = async (req, res) => {
  try {
    const { code, language, input } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });

    // Reuse Piston/Judge0 logic via evaluateCodeAnswer with a single test case
    const evaluation = await evaluateCodeAnswer(null, code, language, [{ input, output: "" }]);

    if (evaluation.cases && evaluation.cases.length > 0) {
      const result = evaluation.cases[0];
      res.json({
        stdout: result.actual,
        status: result.status,
        error: result.error
      });
    } else {
      res.status(500).json({ error: "Execution completed but returned no results" });
    }
  } catch (error) {
    console.error("Run custom code error:", error);
    res.status(500).json({ error: "Code execution failed: " + error.message });
  }
};
