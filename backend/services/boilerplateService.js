import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

export const generateAIContent = async (question, existingBoilerplate = "", existingLanguage = "") => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are an expert software engineer. Given a coding question description and optionally an existing boilerplate code in one language, generate matching boilerplate code templates for other languages: javascript, python, java, cpp.
    
    Make sure the functions have the same logic, name, parameters, and input/output structure.
    Use standard/idiomatic coding structures for each language (e.g., public class Main with a method for Java; a function for Python; a function for JavaScript; a function or class/structure for C++).
    Return a JSON object containing boilerplates for all four languages (javascript, python, java, cpp).
    If no existing boilerplate is provided, create clean, beautiful boilerplates from scratch matching the question.
    Ensure to comment the code appropriately.
    
    Response format MUST be a strict JSON object with exactly these keys:
    {
      "javascript": "string containing JavaScript boilerplate",
      "python": "string containing Python boilerplate",
      "java": "string containing Java boilerplate",
      "cpp": "string containing C++ boilerplate"
    }`;

    const userPrompt = `Question Description:
    ${question}
    
    ${existingBoilerplate && existingLanguage ? `Existing boilerplate in "${existingLanguage}":\n\`\`\`${existingLanguage}\n${existingBoilerplate}\n\`\`\`` : ""}`;

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (error) {
    console.error("Error in generateAIContent using Groq:", error);
    throw error;
  }
};

export const generateAITestCases = async (question) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are an expert software engineer. Given a coding question description, generate 3 to 5 test cases.
    Each test case must specify the input string (stdin) and the expected output string (stdout).
    Design some public test cases (is_hidden: false) that the candidate can see, and some hidden test cases (is_hidden: true) for final assessment evaluation.
    
    Response format MUST be a strict JSON object with exactly this key:
    {
      "test_cases": [
        {
          "input": "input string",
          "output": "expected output string",
          "is_hidden": false
        },
        ...
      ]
    }`;

    const userPrompt = `Question Description:
    ${question}`;

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(res.choices[0].message.content);
    return parsed.test_cases || [];
  } catch (error) {
    console.error("Error in generateAITestCases using Groq:", error);
    throw error;
  }
};
