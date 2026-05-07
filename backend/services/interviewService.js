import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

let _groq;
function getGroq() {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

export const evaluateAnswer = async ({ question, userAnswer, jobRole, difficulty }) => {
  try {
    const prompt = `
      You are an expert technical interviewer.
      Evaluate the candidate's spoken answer to the following question.
      
      Job Role: ${jobRole}
      Difficulty: ${difficulty}
      Question: ${question}
      Candidate's Answer: ${userAnswer}
      
      Please provide your evaluation in JSON format with the following fields:
      - score: A score out of 10.
      - feedback: A brief constructive feedback on the answer.
      - idealAnswer: A high-quality, concise "best answer" for this question that the candidate should have given.
      - correct: Boolean indicating if the answer was largely correct.
      
      Return ONLY the JSON object.
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Evaluation Error:", error);
    throw new Error("Failed to evaluate answer.");
  }
};

export const generateInterviewQuestions = async ({ jobRole, company, jd, count, difficulty }) => {
  try {
    const prompt = `
      Generate ${count} open-ended interview questions for a ${jobRole} position at ${company || 'a top tech company'}.
      Difficulty Level: ${difficulty}
      ${jd ? `Context from Job Description: ${jd}` : ''}
      
      Return the questions in JSON format as an array of objects. Each object should have:
      - id: unique number
      - question: the question text
      
      Return ONLY the JSON object like this: { "questions": [...] }
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(completion.choices[0].message.content);
    return content.questions || content;
  } catch (error) {
    console.error("Interview Question Generation Error:", error);
    throw new Error("Failed to generate interview questions.");
  }
};
