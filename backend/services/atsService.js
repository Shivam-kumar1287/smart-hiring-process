import Groq from "groq-sdk";
import fs from "fs";
import dotenv from "dotenv";
import { PDFParse } from 'pdf-parse';

dotenv.config();

export const getATSScore = async (filePath, jd) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Read file and convert to Uint8Array for the new pdf-parse version
    const fileBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(fileBuffer);

    // Initialize PDFParse and extract text
    const pdf = new PDFParse(uint8Array);
    const data = await pdf.getText();
    const extractedText = data.text || "";

    if (!extractedText) {
      console.warn("No text extracted from PDF");
      return { score: 0, explanation: "Could not extract text from the resume PDF.", suggestions: "Please ensure your resume is a searchable PDF and contains text." };
    }

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert HR application evaluator. You calculate a Criteria Match Score (CRI Score) between 0 and 100 based on how well a candidate's resume matches the Job Description. Provide your response in the following format:\nScore: [number]\nReasoning: [summary of matching/missing skills]\nSuggestions: [3 bullet points on how to improve the resume for this role]"
        },
        {
          role: "user",
          content: `Calculate the CRI Score (0-100), reasoning, and suggestions.\nResume:\n${extractedText}\n\nJD:\n${jd}`
        }
      ]
    });

    const aiResponse = res.choices[0].message.content;

    const scoreMatch = aiResponse.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    const reasonMatch = aiResponse.match(/Reasoning:\s*([\s\S]+?)(?=\nSuggestions:|$)/i);
    const explanation = reasonMatch ? reasonMatch[1].trim() : "Analysis provided.";

    const sugMatch = aiResponse.match(/Suggestions:\s*([\s\S]+)/i);
    const suggestions = sugMatch ? sugMatch[1].trim() : "Maintain your current high standard.";

    return { score, explanation, suggestions };
  } catch (error) {
    console.error("Error in getATSScore using Groq:", error);
    return { score: null, explanation: "Error during AI evaluation", suggestions: null };
  }
};

export const analyzeResumeDetailed = async (filePath, jd) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const fileBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(fileBuffer);
    const pdf = new PDFParse(uint8Array);
    const data = await pdf.getText();
    const extractedText = data.text || "";

    if (!extractedText) {
      throw new Error("Could not extract text from PDF");
    }

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a professional Resume Analyzer. Analyze the resume against the provided Job Description.
          Return a JSON object with exactly these fields:
          {
            "score": number (0-100),
            "hard_skills": ["skill1", "skill2"],
            "soft_skills": ["skill1", "skill2"],
            "missing_skills": ["skill1", "skill2"],
            "suggestions": ["suggestion1", "suggestion2"],
            "summary": "overall summary"
          }`
        },
        {
          role: "user",
          content: `Resume:\n${extractedText}\n\nJob Description:\n${jd}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (error) {
    console.error("Detailed analysis error:", error);
    throw error;
  }
};