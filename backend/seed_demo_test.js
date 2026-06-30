import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./models/database.js";
import User from "./models/userModel.js";
import Job from "./models/jobModel.js";
import Test from "./models/testModel.js";

dotenv.config();

const seed = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB for seeding...");

    // Find or create HR user
    let hr = await User.findOne({ role: "hr" });
    if (!hr) {
      hr = await User.findOne({});
      if (hr) {
        hr.role = "hr";
        await hr.save();
        console.log(`Updated user ${hr.email} to HR role for testing.`);
      } else {
        hr = await User.create({
          name: "Demo HR",
          email: "hr@example.com",
          password: "password123", // normally hashed, but ok for local testing
          role: "hr",
          is_verified: true
        });
        console.log("Created a new HR user: hr@example.com");
      }
    }

    // Find or create a Job
    let job = await Job.findOne({});
    if (!job) {
      job = await Job.create({
        company_name: "Tech Corp",
        job_role: "Software Engineer",
        description: "Looking for an engineer to write standard algorithms.",
        required_skills: "JavaScript, Python, Algorithms",
        rounds: "1",
        created_by: hr._id
      });
      console.log("Created a new Job: Software Engineer");
    }

    // Delete existing Round 1 test for this job to avoid duplicates
    await Test.deleteOne({ job_id: job._id, round_number: 1 });

    // Create the test
    const test = await Test.create({
      job_id: job._id,
      round_number: 1,
      title: "Algorithms & Coding Round",
      description: "Complete this coding challenge. You can run code against public cases and submit once perfect.",
      duration: 30,
      start_time: new Date(),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      show_marks: true,
      questions: [
        {
          type: "code",
          question: "Sum of Two Integers. Write a program that reads two space-separated integers from standard input and prints their sum to standard output.",
          points: 10,
          test_cases: [
            { input: "5 10", output: "15", is_hidden: false },
            { input: "0 0", output: "0", is_hidden: false },
            { input: "-5 5", output: "0", is_hidden: true },
            { input: "999 1", output: "1000", is_hidden: true }
          ],
          boilerplates: [
            {
              language: "javascript",
              code: `// JavaScript Boilerplate\nconst fs = require('fs');\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim();\n    if (!input) return;\n    const parts = input.split(/\\s+/);\n    const a = parseInt(parts[0], 10);\n    const b = parseInt(parts[1], 10);\n    console.log(a + b);\n}\n\nmain();`
            },
            {
              language: "python",
              code: `# Python Boilerplate\nimport sys\n\ndef main():\n    line = sys.stdin.read().strip()\n    if not line:\n        return\n    parts = line.split()\n    a = int(parts[0])\n    b = int(parts[1])\n    print(a + b)\n\nif __name__ == '__main__':\n    main()`
            },
            {
              language: "java",
              code: `// Java Boilerplate\nimport java.util.*;\n\npublic class main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int a = sc.nextInt();\n            int b = sc.nextInt();\n            System.out.println(a + b);\n        }\n    }\n}`
            },
            {
              language: "cpp",
              code: `// C++ Boilerplate\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << a + b << endl;\n    }\n    return 0;\n}`
            }
          ]
        }
      ],
      created_by: hr._id
    });

    console.log("✅ Successfully seeded algorithms test assessment!");
    console.log(`Test ID: ${test._id}`);
    console.log(`Job ID: ${job._id}`);
    console.log(`HR User: ${hr.email}`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seed();
