import Application from "../models/applicationModel.js";
import Job from "../models/jobModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import { sendMail } from "../utils/mailer.js";

/**
 * ✅ APPLY JOB (USER)
 * POST /api/applications
 */
export const applyJob = async (req, res) => {
  try {
    const { job_id, cover_letter, use_profile } = req.body;
    const user_id = req.user.id;
    const resume_file = req.file;

    if (!job_id) {
      return res.status(400).json("Job ID is required");
    }

    // Check if already applied
    const existing = await Application.findOne({ user_id, job_id });

    if (existing) {
      return res.status(400).json("Already applied to this job");
    }

    // Get job details and check status
    const job = await Job.findById(job_id);
    if (!job) {
      return res.status(404).json("Job not found");
    }
    if (job.status === 'closed') {
      return res.status(400).json("This job is no longer accepting applications");
    }

    // Check if applying with profile or resume
    if (!resume_file && use_profile !== 'true' && use_profile !== true) {
      return res.status(400).json("Please upload a resume or choose to apply using your profile.");
    }

    // Get user details if using profile for ATS
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json("User not found");

    // Insert application
    const resume_path = resume_file ? resume_file.path : null;
    const application = await Application.create({
      user_id,
      job_id,
      cover_letter: cover_letter || "",
      resume_path,
      status: 'pending',
      applied_with_profile: !resume_path
    });

    try {
      // Calculate CRI score
      const { getATSScore, analyzeResumeDetailed } = await import("../services/atsService.js");
      
      let atsResult;
      if (resume_path) {
        atsResult = await getATSScore(resume_path, job.description);
      } else {
        // Construct a text representation of the profile for ATS analysis
        const profileText = `
          Name: ${user.name}
          Bio: ${user.bio}
          Hard Skills: ${user.hard_skills?.join(', ') || 'None'}
          Soft Skills: ${user.soft_skills?.join(', ') || 'None'}
          Education: ${user.education.map(e => `${e.degree} from ${e.institution} (${e.year})`).join('; ')}
          Experience: ${user.experience.map(e => `${e.position} at ${e.company} (${e.duration}): ${e.description}`).join('; ')}
          Projects: ${user.projects.map(p => `${p.title}: ${p.description}`).join('; ')}
        `;
        // Use detailed analysis service for profile text
        const analysis = await analyzeResumeDetailed(null, job.description, profileText);
        atsResult = {
          score: analysis.score,
          explanation: analysis.summary,
          suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions.join('\n') : analysis.suggestions
        };
      }
      
      // Update application with ATS result
      if (atsResult && atsResult.score !== null) {
        application.ats_score = atsResult.score;
        application.ats_explanation = atsResult.explanation;
        application.ats_suggestions = atsResult.suggestions;
        await application.save();
      }
    } catch (atsError) {
      console.error("ATS scoring error:", atsError);
      // Continue without ATS score if it fails
    }

    res.json("Applied successfully");
  } catch (err) {
    console.error("Application error:", err);
    res.status(500).json("Application failed");
  }
};

export const getApplications = async (req, res) => {
  try {
    const hrId = req.user.id;
    
    const applications = await Application.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "job_id",
          foreignField: "_id",
          as: "job"
        }
      },
      { $unwind: "$job" },
      { $match: { "job.created_by": new mongoose.Types.ObjectId(hrId) } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $sort: { createdAt: -1 } }
    ]);

    const formatted = applications.map(app => ({
      ...app,
      id: app._id.toString(),
      user_name: app.user.name,
      user_email: app.user.email,
      phone: app.user.phone,
      location: app.user.location,
      bio: app.user.bio,
      hard_skills: app.user.hard_skills,
      soft_skills: app.user.soft_skills,
      social_links: app.user.social_links,
      profile_image: app.user.profile_image,
      education: app.user.education,
      experience: app.user.experience,
      projects: app.user.projects,
      certifications: app.user.certifications,
      achievements: app.user.achievements,
      custom_sections: app.user.custom_sections,
      job_role: app.job.job_role,
      company_name: app.job.company_name,
      rounds: app.job.rounds
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json("Error fetching applications");
  }
};

/**
 * ✅ GET PENDING APPLICATIONS (HR)
 */
export const getPendingApplications = async (req, res) => {
  try {
    const hrId = req.user.id;
    
    const applications = await Application.aggregate([
      { $match: { status: 'pending' } },
      {
        $lookup: {
          from: "jobs",
          localField: "job_id",
          foreignField: "_id",
          as: "job"
        }
      },
      { $unwind: "$job" },
      { $match: { "job.created_by": new mongoose.Types.ObjectId(hrId) } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $sort: { createdAt: -1 } }
    ]);

    const formatted = applications.map(app => ({
      ...app,
      id: app._id.toString(),
      user_name: app.user.name,
      user_email: app.user.email,
      phone: app.user.phone,
      location: app.user.location,
      bio: app.user.bio,
      skills: app.user.skills,
      social_links: app.user.social_links,
      profile_image: app.user.profile_image,
      education: app.user.education,
      experience: app.user.experience,
      projects: app.user.projects,
      certifications: app.user.certifications,
      achievements: app.user.achievements,
      custom_sections: app.user.custom_sections,
      job_role: app.job.job_role,
      company_name: app.job.company_name,
      rounds: app.job.rounds
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching pending applications:", error);
    res.status(500).json("Error fetching applications");
  }
};

/**
 * ✅ GET MY APPLICATIONS (USER)
 */
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ user_id: req.user.id })
      .populate('job_id')
      .sort({ createdAt: -1 });

    const formatted = applications.map(app => ({
      ...app.toObject(),
      id: app._id.toString(),
      job_role: app.job_id ? app.job_id.job_role : "Job Unavailable",
      company_name: app.job_id ? app.job_id.company_name : "Unknown Company",
      description: app.job_id ? app.job_id.description : "This job listing is no longer available.",
      rounds: app.job_id ? app.job_id.rounds : 0
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching my applications:", error);
    res.status(500).json("Error fetching applications");
  }
};

/**
 * ✅ ACCEPT APPLICATION (HR)
 */
export const acceptApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id).populate('user_id').populate('job_id');

    if (!application) return res.status(404).json("Application not found");
    if (application.status !== 'pending') return res.status(400).json("Application is already " + application.status);

    application.status = 'accepted';
    application.current_round = '1';
    await application.save();

    // Check if there are any active tests for this round
    const Test = mongoose.model("Test");
    const test = await Test.findOne({ 
      job_id: application.job_id._id, 
      round_number: parseInt(application.current_round || 0) 
    });

    let testInfo = "";
    if (test) {
      testInfo = `\n\nYou have a pending assessment for this round: "${test.title}".\nPlease log in to your dashboard to complete it before ${new Date(test.end_time).toLocaleString()}.`;
    }

    // Send acceptance email
    await sendMail(
      application.user_id.email,
      "Application Approved! 🥳",
      `Congratulations ${application.user_id.name}!\n\nYour application for the ${application.job_id.job_role} position at ${application.job_id.company_name} has been approved!\n\nOur AI-driven HR evaluation determined that your resume strongly meets the required criteria, achieving an excellent CRI Match Score of ${application.ats_score || "N/A"}%.\n${testInfo}\n\nWe are excited about your qualifications and will be in touch shortly regarding the next steps.\n\nBest regards,\n${application.job_id.company_name} HR Team`
    );


    res.json("Application accepted successfully");
  } catch (error) {
    console.error("Error accepting application:", error);
    res.status(500).json("Error accepting application");
  }
};

export const promoteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id).populate('job_id user_id');
    if (!application) return res.status(404).json({ error: "Application not found" });

    // Increment round
    const nextRound = parseInt(application.current_round || 0) + 1;
    application.current_round = nextRound.toString();
    await application.save();

    // Notify candidate about next round
    const Test = mongoose.model("Test");
    const test = await Test.findOne({ job_id: application.job_id._id, round_number: nextRound });
    
    let message = `Congratulations! You have been promoted to Round ${nextRound} for the position of ${application.job_id.job_role}.`;
    if (test) {
      message += `\n\nA new assessment "${test.title}" is now available on your dashboard.`;
    }

    try {
      await sendMail(
        application.user_id.email,
        `Promoted to Round ${nextRound} - ${application.job_id.company_name}`,
        message
      );
    } catch (e) { console.error("Mail failed", e); }

    res.json({ message: `Candidate promoted to Round ${nextRound}`, current_round: application.current_round });
  } catch (error) {
    res.status(500).json({ error: "Promotion failed" });
  }
};

export const rejectFromAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id).populate('job_id user_id');
    if (!application) return res.status(404).json({ error: "Application not found" });

    application.status = 'rejected';
    await application.save();

    try {
      await sendMail(
        application.user_id.email,
        `Application Update - ${application.job_id.company_name}`,
        `We regret to inform you that we will not be moving forward with your application for the ${application.job_id.job_role} position after reviewing your recent assessment results.`
      );
    } catch (e) { console.error("Mail failed", e); }

    res.json({ message: "Application rejected based on assessment" });
  } catch (error) {
    res.status(500).json({ error: "Rejection failed" });
  }
};

/**
 * ✅ REJECT APPLICATION (HR)
 */
export const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id).populate('user_id').populate('job_id');

    if (!application) return res.status(404).json("Application not found");
    if (application.status !== 'pending') return res.status(400).json("Application is already " + application.status);

    application.status = 'rejected';
    await application.save();

    // Send rejection email
    await sendMail(
      application.user_id.email,
      "Application Update - Smart Job Tracker",
      `Dear ${application.user_id.name},\n\nThank you for your interest in the ${application.job_id.job_role} position at ${application.job_id.company_name}.\n\nAfter a careful AI-driven review of your application, your resume attained a CRI Match Score of ${application.ats_score || "N/A"}%. Unfortunately, we have decided to move forward with other candidates whose qualifications more closely align with our current needs.\n\nWe encourage you to apply for future openings that may be a better fit.\n\nBest regards,\n${application.job_id.company_name} HR Team`
    );

    res.json("Application rejected successfully");
  } catch (error) {
    console.error("Error rejecting application:", error);
    res.status(500).json("Error rejecting application");
  }
};

export const getApplicationAnalytics = async (req, res) => {
  try {
    const hrId = req.user.id;
    
    const analytics = await Application.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "job_id",
          foreignField: "_id",
          as: "job"
        }
      },
      { $unwind: "$job" },
      { $match: { "job.created_by": new mongoose.Types.ObjectId(hrId) } },
      {
        $group: {
          _id: null,
          total_applications: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          avg_ats_score: { $avg: { $toDouble: "$ats_score" } },
          max_ats_score: { $max: { $toDouble: "$ats_score" } },
          min_ats_score: { $min: { $toDouble: "$ats_score" } }
        }
      }
    ]);

    const trends = await Application.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "job_id",
          foreignField: "_id",
          as: "job"
        }
      },
      { $unwind: "$job" },
      { $match: { "job.created_by": new mongoose.Types.ObjectId(hrId) } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          applications: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    const topJobs = await Job.aggregate([
      { $match: { created_by: new mongoose.Types.ObjectId(hrId) } },
      {
        $lookup: {
          from: "applications",
          localField: "_id",
          foreignField: "job_id",
          as: "apps"
        }
      },
      {
        $addFields: {
          total_applications: { $size: "$apps" },
          accepted_apps: {
            $size: {
              $filter: {
                input: "$apps",
                as: "app",
                cond: { $eq: ["$$app.status", "accepted"] }
              }
            }
          }
        }
      },
      { $match: { total_applications: { $gt: 0 } } },
      {
        $addFields: {
          acceptance_rate: { $multiply: [{ $divide: ["$accepted_apps", "$total_applications"] }, 100] }
        }
      },
      { $sort: { acceptance_rate: -1 } },
      { $limit: 5 }
    ]);

    const result = {
      ...(analytics[0] || {
        total_applications: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        avg_ats_score: 0,
        max_ats_score: 0,
        min_ats_score: 0
      }),
      trends: trends.map(t => ({ date: t._id, applications: t.applications })),
      top_jobs: topJobs.map(j => ({
        id: j._id,
        job_role: j.job_role,
        company_name: j.company_name,
        total_applications: j.total_applications,
        acceptance_rate: j.acceptance_rate
      }))
    };
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching application analytics:", error);
    res.status(500).json("Error fetching application analytics");
  }
};

export const getApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const hrId = req.user.id;
    
    const application = await Application.findById(id)
      .populate('user_id')
      .populate('job_id');

    if (!application || !application.job_id || application.job_id.created_by.toString() !== hrId) {
      return res.status(404).json("Application or Job not found");
    }
    
    const appObj = application.toObject();
    const result = {
      ...appObj,
      id: appObj._id.toString(),
      user_name: appObj.user_id.name,
      user_email: appObj.user_id.email,
      phone: appObj.user_id.phone,
      location: appObj.user_id.location,
      hard_skills: appObj.user_id.hard_skills,
      soft_skills: appObj.user_id.soft_skills,
      bio: appObj.user_id.bio,
      social_links: appObj.user_id.social_links,
      profile_image: appObj.user_id.profile_image,
      education: appObj.user_id.education,
      experience: appObj.user_id.experience,
      projects: appObj.user_id.projects,
      certifications: appObj.user_id.certifications,
      achievements: appObj.user_id.achievements,
      custom_sections: appObj.user_id.custom_sections,
      job_role: appObj.job_id.job_role,
      company_name: appObj.job_id.company_name,
      description: appObj.job_id.description,
      required_skills: appObj.job_id.required_skills,
      rounds: appObj.job_id.rounds
    };

    res.json(result);
  } catch (error) {
    console.error("Error fetching application details:", error);
    res.status(500).json("Error fetching application details");
  }
};

export const getApplicationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await Application.find({ user_id: userId })
      .populate('job_id')
      .sort({ createdAt: -1 });
    
    const formatted = history.map(app => ({
      ...app.toObject(),
      id: app._id.toString(),
      job_role: app.job_id ? app.job_id.job_role : "Job Unavailable",
      company_name: app.job_id ? app.job_id.company_name : "Unknown Company",
      description: app.job_id ? app.job_id.description : "This job listing is no longer available.",
      required_skills: app.job_id ? app.job_id.required_skills : []
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching application history:", error);
    res.status(500).json("Error fetching application history");
  }
};

export const updateApplicationRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { round } = req.body;
    
    const application = await Application.findById(id).populate('user_id').populate('job_id');

    if (!application || !application.job_id) return res.status(404).json("Application or Job not found");

    application.current_round = round;
    await application.save();

    // If this is the final round
    if (parseInt(round) >= parseInt(application.job_id.rounds)) {
      if (!application.is_offer_sent) {
        try {
          const { generateOfferLetter } = await import("../utils/offerLetterGenerator.js");
          const filePath = await generateOfferLetter(application.user_id.name, application.job_id.job_role, application.job_id.company_name);
          
          application.is_offer_sent = true;
          await application.save();

          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(to right, #2563eb, #7c3aed); padding: 40px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">CONGRATULATIONS!</h1>
              </div>
              <div style="padding: 40px 30px; line-height: 1.6; color: #334155;">
                <p style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">Dear ${application.user_id.name},</p>
                <p>We are absolutely thrilled to inform you that you have successfully completed all rounds of interviews for the position of <strong>${application.job_id.job_role}</strong> at <strong>${application.job_id.company_name}</strong>.</p>
                <p>Your performance throughout our rigorous selection process was exceptional, and we believe you will be a fantastic addition to our professional family.</p>
                <div style="background: #f8fafc; padding: 25px; border-radius: 15px; margin: 30px 0; border: 1px solid #f1f5f9;">
                  <p style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 10px;">Next Steps</p>
                  <p style="margin: 0;">Please find your official <strong>Offer Letter</strong> attached to this email. We encourage you to review it carefully and reach out to our team if you have any questions.</p>
                </div>
                <p>We can't wait to see the impact you'll make here!</p>
                <p style="margin-top: 40px; font-weight: bold;">Warm Regards,</p>
                <p style="margin: 0; color: #2563eb; font-weight: 800;">The Talent Acquisition Team</p>
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">${application.job_id.company_name}</p>
              </div>
            </div>
          `;

          await sendMail(
            application.user_id.email,
            `Exciting News: Your Official Offer Letter from ${application.job_id.company_name}`,
            `Congratulations ${application.user_id.name}! You have been selected for the position of ${application.job_id.job_role} at ${application.job_id.company_name}. Please find your offer letter attached.`,
            html,
            [{ filename: 'Offer_Letter.pdf', path: filePath }]
          );

        } catch (err) {
          console.error("Error sending offer letter:", err);
          application.is_offer_sent = false;
          await application.save();
        }
      }
    }
    
    res.json("Application round updated successfully");
  } catch (error) {
    console.error("Error updating application round:", error);
    res.status(500).json("Error updating application round");
  }
};

export const analyzeResume = async (req, res) => {
  try {
    const { jd, resume_text } = req.body;
    const resume_path = req.file ? req.file.path : null;

    if ((!resume_path && !resume_text) || !jd) {
      return res.status(400).json("Resume (file or text) and Job Description are required");
    }

    const { analyzeResumeDetailed } = await import("../services/atsService.js");
    const analysis = await analyzeResumeDetailed(resume_path, jd, resume_text);
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing resume:", error);
    res.status(500).json("Error during analysis: " + error.message);
  }
};

