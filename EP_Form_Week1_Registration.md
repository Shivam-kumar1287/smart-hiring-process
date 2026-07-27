# Week 1: Exploratory Project (EP) 22CS-401 (2026)
## Project Registration & Idea Finalization Document

---

### Part 1: Google Form Field Responses
Below are the exact values to copy and paste into your Google Form for **Week 1: Project Idea Finalization & Team Registration**.

| Google Form Field | Recommended Response |
| :--- | :--- |
| **Group \*** | *[Select your Group, e.g., G15, G16, G17, or specify in 'Other']* |
| **Name \*** | Shivam Kumar |
| **University Roll No (Submitter) \*** | *[Enter your University Roll Number, e.g., 231099XXXX]* |
| **Domain/Field** | **Web & Mobile Application** (with **Artificial Intelligence & Machine Learning** and **NLP & Chatbots** integration) |
| **Project Title \*** | **Smart Job Tracker: AI-Powered Recruitment Management & Online Assessment System** |
| **Tools & Technologies \*** | **Frontend**: React 19, Axios, Tailwind CSS 4, Monaco Editor (React)<br>**Backend**: Node.js, Express.js, JWT (JSON Web Tokens), Multer, pdf-parse<br>**Database**: MongoDB Atlas<br>**AI Integration**: Groq Cloud SDK (Llama 3.3 - 70b - versatile)<br>**Real-time/Communication**: WebRTC (peer-to-peer audio/video)<br>**Testing**: Jest, Postman |
| **Name of Team Members \*** | 1. **Shivam Kumar** (Team Lead)<br>2. *[Team Member 2 Name]*<br>3. *[Team Member 3 Name]*<br>4. *[Team Member 4 Name]* |
| **Roll No of Team Mates** | 1. *[Your Roll No]*<br>2. *[Member 2 Roll No]*<br>3. *[Member 3 Roll No]*<br>4. *[Member 4 Roll No]* |
| **Methodology \*** *(Describe technical approach in 3–4 lines)* | The Smart Job Tracker follows a client-server architecture built on the MERN stack (MongoDB, Express, React, Node.js). It integrates Groq Cloud’s Llama 3.3 LLM for AI-powered resume parsing and ATS scoring via API requests. Online assessments are conducted using a browser-based Monaco editor with backend test-case evaluation and event-driven tab-switch cheating detection. Security is enforced through JSON Web Tokens (JWT) and Role-Based Access Control (RBAC). |

---

### Part 2: Project Proposal & Synopsis
*This section can be printed to PDF or saved as a Word document and uploaded under the **"Week 1: Project Idea Finalization & Team Registration"** file upload field.*

# PROJECT PROPOSAL: SMART JOB TRACKER
**Course Code:** 22CS-401 (Exploratory Project - EP)  
**Academic Session:** July – December 2026  

---

## 1. Project Title
**Smart Job Tracker: AI-Powered Recruitment Management & Online Assessment Platform**

## 2. Domain & Field
Web & Mobile Application / Artificial Intelligence & Machine Learning (NLP & Chatbots)

## 3. Abstract
The **Smart Job Tracker** is a full-stack AI-powered recruitment management system developed to simplify and optimize the modern hiring process for both employers and job seekers. Traditional recruitment methods often involve manual resume screening, fragmented application management, delayed communication, and inefficient candidate evaluation, leading to increased hiring time and missed opportunities. This project aims to address these challenges by providing a centralized, intelligent, and automated recruitment platform.

The system enables HR professionals to create and manage job postings, track applications, shortlist candidates, and monitor recruitment progress through a dynamic dashboard. Candidates can search for jobs, apply online, track application status, and receive personalized feedback for resume improvement. One of the key features of the platform is AI-powered resume analysis, where resumes are evaluated against job descriptions using Groq Cloud’s Llama 3 models to generate a Criteria Match Score (CRI) and identify skill gaps.

Additionally, the system includes features such as automated offer letter generation, AI-generated interview questions and MCQs, and responsive UI design using Tailwind CSS. Overall, the Smart Job Tracker provides a scalable, secure, and efficient recruitment solution that improves hiring accuracy, enhances candidate experience, and reduces manual workload for recruiters.

---

## 4. Key Features
* **AI-Powered Resume Analysis & ATS**: Integrates with Groq Cloud’s Llama 3.3 models to parse resumes and compute a Criteria Match Score (CRI) out of 100, highlighting matched skills, missing skills, and feedback.
* **Dynamic Dashboards**: Separate interactive panels for HR managers (to create jobs, manage pipelines, shortlist applicants) and Candidates (to track applications in real time).
* **Online Assessment Engine**: Includes a browser-based code editor (Monaco Editor) that compiles and evaluates user code against test cases in the backend.
* **Anti-Cheating Module**: Implements web-page visibility change listeners (tab-switch detection) to monitor and flag academic/professional dishonesty during tests.
* **Virtual Interview Room**: Integrated WebRTC communication channel enabling direct peer-to-peer video and audio calls with real-time text chat.
* **Automated Document Generation**: Generates official job offer letters in PDF format dynamically when candidates are selected.

---

## 5. Technology Stack
* **Frontend**: React 19, Tailwind CSS 4, Axios, Monaco Editor (`@monaco-editor/react`)
* **Backend**: Node.js, Express.js (REST APIs)
* **Database**: MongoDB Atlas (NoSQL Document Store)
* **Authentication**: JSON Web Tokens (JWT) with bcrypt hashing
* **AI Service**: Groq Cloud SDK (running Llama-3.3-70b-versatile model)
* **API Testing**: Jest, Postman
* **Deployment**: Vercel (Frontend), Render/AWS (Backend)

---

## 6. Proposed Methodology
1. **Client-Server Architecture**: The application separates concerns using a React Single Page Application (SPA) for the client side and an Express.js server for the backend REST APIs.
2. **AI Analysis Workflow**: Uploaded resume PDFs are read in the backend, parsed using `pdf-parse`, and structured. The text is combined with the job description in a prompt, which is processed by the Llama 3.3 model via the Groq SDK. The model returns structured JSON containing scores and feedback.
3. **Assessment Compiler**: Candidates write code in React. The code is sent to the backend, run inside an isolated runner, and verified against pre-configured test cases.
4. **Data Security**: Secure cookies and Authorization headers transport JWT tokens. Routes are restricted using middleware that performs Role-Based Access Control (RBAC) verification.

---

## 7. Projected Development Timeline (July – December 2026)
* **Month 1 (July)**: Requirement Gathering, Architecture Design, Database Schema Modeling, & Initial Setup.
* **Month 2 (August)**: Frontend Mockups, JWT Authentication, and Job Posting (CRUD) Backend APIs.
* **Month 3 (September)**: Integration of Groq Cloud AI SDK for Resume Parsing, Match Scoring, and Suggestions.
* **Month 4 (October)**: Monaco Editor Integration, Online Test Assessment Engine, & Tab-Switch Anti-Cheating Module.
* **Month 5 (November)**: WebRTC Video Call Integration, Automated PDF Offer Letter Generation, and Unit/Integration Testing.
* **Month 6 (December)**: Deployment (Vercel & Render), Performance Optimization, Project Report compilation, and Final Evaluation.

---

## 8. Team Roles & Responsibilities
* **Shivam Kumar (Team Lead & Backend Developer)**:
  * Overall project architecture, system design, and database schema setup.
  * Express.js API development, JWT Authentication, and database integration (MongoDB).
  * Groq AI API integration (ATS scoring and resume analysis).
* **Team Member 2 (Frontend Developer)**:
  * React UI components, Tailwind CSS styling, responsive layout designs.
  * Integration of client-side Axios calls with backend REST endpoints.
* **Team Member 3 (Assessment & WebRTC Specialist)**:
  * Implementing Monaco Editor and designing the assessment runner.
  * Tab-switch detection logic and WebRTC peer-to-peer connection for meeting rooms.
* **Team Member 4 (Tester & DevOps Engineer)**:
  * Writing test cases using Jest for APIs and React Components.
  * Creating documentation, deployment on Vercel/Render, and final report compiling.

---
*(End of Proposal)*
