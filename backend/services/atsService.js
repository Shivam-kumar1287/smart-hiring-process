import Groq from "groq-sdk";
import fs from "fs";
import dotenv from "dotenv";
import pdfParse from "./pdfHelper.cjs";

dotenv.config();

export const getATSScore = async (filePath, jd) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Read file as buffer and pass to standard pdfParse
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
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
          content: `You are an expert HR application evaluator. Analyze the resume against the provided Job Description.
          Return a JSON object with exactly these fields:
          {
            "score": number (0-100),
            "explanation": "summary of matching/missing skills",
            "suggestions": ["suggestion1", "suggestion2"]
          }`
        },
        {
          role: "user",
          content: `Resume:\n${extractedText}\n\nJob Description:\n${jd}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(res.choices[0].message.content);
    return { 
      score: analysis.score, 
      explanation: analysis.explanation, 
      suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions.join('\n') : analysis.suggestions
    };
  } catch (error) {
    console.error("Error in getATSScore using Groq:", error);
    return { score: 0, explanation: "Error during AI evaluation", suggestions: "Please try again later." };
  }
};

export const analyzeResumeDetailed = async (filePath, jd, resumeText = "") => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let extractedText = resumeText;
    
    if (!extractedText && filePath) {
      const fileBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(fileBuffer);
      extractedText = data.text || "";
    }

    if (!extractedText) {
      throw new Error("Could not get text from Resume");
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