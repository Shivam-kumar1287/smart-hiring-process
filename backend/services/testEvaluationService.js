import Groq from "groq-sdk";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const evaluateTheoryAnswer = async (question, answer) => {
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert technical interviewer. Evaluate the theory answer based on the question. Return a JSON object: { \"score\": number (0-1), \"feedback\": \"short explanation\" }"
        },
        {
          role: "user",
          content: `Question: ${question}\nAnswer: ${answer}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (error) {
    console.error("Theory evaluation error:", error);
    return { score: 0, feedback: "Error in AI evaluation" };
  }
};

const languageMap = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54
};

export const evaluateCodeAnswer = async (question, code, language, testCases) => {
  try {
    if (!testCases || testCases.length === 0) {
      return { score: 1, passed_tests: 0, total_tests: 0, feedback: "No test cases provided.", is_perfect: true };
    }

    const languageId = languageMap[language] || 63;
    let passedCount = 0;
    let errorFeedback = "";

    const judge0Url = process.env.JUDGE0_URL || "https://ce.judge0.com";
    const headers = {};
    if (process.env.RAPIDAPI_KEY) {
      headers["X-RapidAPI-Key"] = process.env.RAPIDAPI_KEY;
      headers["X-RapidAPI-Host"] = process.env.RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
    }

    for (const tc of testCases) {
      try {
        const response = await axios.post(
          `${process.env.RAPIDAPI_KEY ? "https://judge0-ce.p.rapidapi.com" : judge0Url}/submissions?base64_encoded=false&wait=true`,
          {
            source_code: code,
            language_id: languageId,
            stdin: tc.input,
            expected_output: tc.output
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...headers
            }
          }
        );

        const execution = response.data;
        const stdout = (execution.stdout || "").trim();
        const expected = (tc.output || "").trim();
        const isCorrect = stdout === expected || execution.status?.id === 3;

        if (isCorrect) {
          passedCount++;
        } else if (!errorFeedback) {
          errorFeedback = execution.status?.description || "Wrong Answer";
          if (execution.stderr || execution.compile_output) {
            errorFeedback += `: ${execution.stderr || execution.compile_output}`;
          }
        }
      } catch (err) {
        if (!errorFeedback) errorFeedback = `Execution error: ${err.message}`;
      }
    }

    const score = passedCount / testCases.length;
    return {
      score,
      passed_tests: passedCount,
      total_tests: testCases.length,
      feedback: passedCount === testCases.length ? "All test cases passed." : `Failed at test cases. Reason: ${errorFeedback.substring(0, 150)}`,
      is_perfect: passedCount === testCases.length
    };
  } catch (error) {
    console.error("Code evaluation error:", error);
    return { score: 0, feedback: "Error running Judge0", passed_tests: 0, total_tests: testCases.length, is_perfect: false };
  }
};
