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

const pistonLanguageMap = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "c++"
};

const runSinglePiston = async (code, language, tc) => {
  const pistonLang = pistonLanguageMap[language] || "javascript";
  const pistonUrl = process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute";
  
  const payload = {
    language: pistonLang,
    version: "*",
    files: [
      {
        content: code
      }
    ],
    stdin: tc.input || ""
  };

  const response = await axios.post(pistonUrl, payload, { timeout: 8000 });
  const data = response.data;

  let actual = "";
  let passed = false;
  let status = "Accepted";
  let error = null;

  if (data.compile && data.compile.code !== 0) {
    status = "Compilation Error";
    error = data.compile.stderr || data.compile.output || "Compilation failed";
  } else if (!data.run) {
    status = "Compilation Error";
    error = "Execution failed, no output received";
  } else {
    const run = data.run;
    actual = (run.stdout || "").trim().replace(/\r\n/g, "\n");
    const expected = (tc.output || "").trim().replace(/\r\n/g, "\n");

    if (run.signal === "SIGKILL" || run.signal === "SIGTERM" || run.signal === "SIGXCPU" || run.code === null) {
      status = "Time Limit Exceeded";
      error = run.stderr || "Time limit exceeded (process terminated).";
    } else if (run.code !== 0) {
      status = "Runtime Error";
      error = run.stderr || `Runtime exited with code ${run.code}`;
    } else if (actual === expected) {
      passed = true;
      status = "Accepted";
    } else {
      status = "Wrong Answer";
    }
  }

  return {
    input: tc.input,
    expected: tc.output,
    actual,
    passed,
    status,
    error,
    is_hidden: tc.is_hidden || false
  };
};

const runSingleJudge0 = async (code, language, tc) => {
  const languageId = languageMap[language] || 63;
  const judge0Url = process.env.JUDGE0_URL || "https://ce.judge0.com";
  const headers = {};
  if (process.env.RAPIDAPI_KEY) {
    headers["X-RapidAPI-Key"] = process.env.RAPIDAPI_KEY;
    headers["X-RapidAPI-Host"] = process.env.RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
  }

  const response = await axios.post(
    `${process.env.RAPIDAPI_KEY ? "https://judge0-ce.p.rapidapi.com" : judge0Url}/submissions?base64_encoded=false&wait=true`,
    {
      source_code: code,
      language_id: languageId,
      stdin: tc.input || "",
      expected_output: tc.output || ""
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      timeout: 8000
    }
  );

  const execution = response.data;
  const stdout = (execution.stdout || "").trim().replace(/\r\n/g, "\n");
  const expected = (tc.output || "").trim().replace(/\r\n/g, "\n");
  
  let passed = false;
  let status = "Wrong Answer";
  let error = null;

  const statusId = execution.status?.id || 3;
  const statusDesc = execution.status?.description || "Accepted";

  if (statusId === 3) {
    passed = true;
    status = "Accepted";
  } else if (statusId === 4) {
    status = "Wrong Answer";
  } else if (statusId === 5) {
    status = "Time Limit Exceeded";
    error = "Time limit exceeded.";
  } else if (statusId === 6) {
    status = "Compilation Error";
    error = execution.compile_output || "Compilation error.";
  } else {
    status = "Runtime Error";
    error = execution.stderr || statusDesc;
  }

  return {
    input: tc.input,
    expected: tc.output,
    actual: stdout || execution.stderr || execution.compile_output || "",
    passed,
    status,
    error,
    is_hidden: tc.is_hidden || false
  };
};

export const evaluateCodeAnswer = async (question, code, language, testCases) => {
  try {
    if (!testCases || testCases.length === 0) {
      return { score: 1, passed_tests: 0, total_tests: 0, feedback: "No test cases provided.", is_perfect: true, cases: [] };
    }

    const results = [];
    let useJudge0 = false;
    
    // Attempt the first testcase on Piston to verify availability
    const tc1 = testCases[0];
    let firstResult;
    try {
      firstResult = await runSinglePiston(code, language, tc1);
    } catch (err) {
      console.warn("Piston API error, falling back to Judge0:", err.message);
      useJudge0 = true;
    }

    if (useJudge0) {
      // Run all testcases in parallel on Judge0
      const runPromises = testCases.map(tc => runSingleJudge0(code, language, tc));
      const judge0Results = await Promise.all(runPromises);
      results.push(...judge0Results);
    } else {
      results.push(firstResult);
      if (firstResult.status === "Compilation Error") {
        for (let i = 1; i < testCases.length; i++) {
          results.push({
            input: testCases[i].input,
            expected: testCases[i].output,
            actual: "",
            passed: false,
            status: "Compilation Error",
            error: firstResult.error,
            is_hidden: testCases[i].is_hidden || false
          });
        }
      } else {
        // Run remaining testcases in parallel on Piston
        const remainingPromises = testCases.slice(1).map(tc => runSinglePiston(code, language, tc));
        const remainingResults = await Promise.all(remainingPromises);
        results.push(...remainingResults);
      }
    }

    const passedCount = results.filter(r => r.passed).length;
    const score = passedCount / testCases.length;
    const firstFailure = results.find(r => !r.passed);
    const feedback = passedCount === testCases.length 
      ? "All test cases passed." 
      : `Failed at test cases. Reason: ${firstFailure ? firstFailure.status : "Wrong Answer"}`;

    return {
      score,
      passed_tests: passedCount,
      total_tests: testCases.length,
      feedback,
      is_perfect: passedCount === testCases.length,
      cases: results
    };
  } catch (error) {
    console.error("Code evaluation error:", error);
    return { 
      score: 0, 
      feedback: "Error running code execution: " + error.message, 
      passed_tests: 0, 
      total_tests: testCases.length, 
      is_perfect: false, 
      cases: testCases.map(tc => ({
        input: tc.input,
        expected: tc.output,
        actual: "Error",
        passed: false,
        status: "Error",
        error: error.message,
        is_hidden: tc.is_hidden || false
      }))
    };
  }
};
