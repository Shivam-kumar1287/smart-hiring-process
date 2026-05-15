import Groq from "groq-sdk";
import dotenv from "dotenv";

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

export const evaluateCodeAnswer = async (question, code, language, testCases) => {
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a professional code evaluator. Evaluate the ${language} code against the question and provided test cases. 
          Return a JSON object with:
          {
            "score": number (0-1), 
            "passed_tests": number,
            "total_tests": number,
            "feedback": "short explanation",
            "is_perfect": boolean
          }`
        },
        {
          role: "user",
          content: `Question: ${question}\nCode:\n${code}\nLanguage: ${language}\nTest Cases: ${JSON.stringify(testCases)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (error) {
    console.error("Code evaluation error:", error);
    return { score: 0, feedback: "Error in AI evaluation", passed_tests: 0, total_tests: testCases.length };
  }
};
