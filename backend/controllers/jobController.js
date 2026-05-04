import Job from "../models/jobModel.js";
import Application from "../models/applicationModel.js";
import mongoose from "mongoose";

export const createJob = async (req, res) => {
  try {
    const { company_name, job_role, description, required_skills, rounds } = req.body;

    const job = await Job.create({
      company_name,
      job_role,
      description,
      required_skills,
      rounds,
      created_by: req.user.id
    });

    res.json({ message: "Job created successfully", jobId: job._id });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json("Error creating job");
  }
};

export const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' }).sort({ createdAt: -1 });
    // Add id field for frontend compatibility
    const jobsWithId = jobs.map(job => {
      const jobObj = job.toObject();
      jobObj.id = jobObj._id.toString();
      return jobObj;
    });
    res.json(jobsWithId);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json("Error fetching jobs");
  }
};

export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.aggregate([
      { $match: { created_by: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $lookup: {
          from: "applications",
          localField: "_id",
          foreignField: "job_id",
          as: "applicants"
        }
      },
      {
        $addFields: {
          applicant_count: { $size: "$applicants" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    // Add id field for frontend compatibility
    const jobsWithId = jobs.map(job => ({
      ...job,
      id: job._id.toString()
    }));
    
    res.json(jobsWithId);
  } catch (error) {
    console.error("Error fetching my jobs:", error);
    res.status(500).json("Error fetching jobs");
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, job_role, description, required_skills, rounds } = req.body;

    await Job.findOneAndUpdate(
      { _id: id, created_by: req.user.id },
      { company_name, job_role, description, required_skills, rounds }
    );

    res.json("Job updated successfully");
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json("Error updating job");
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    await Job.findOneAndDelete({ _id: id, created_by: req.user.id });

    res.json("Job deleted successfully");
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json("Error deleting job");
  }
};

export const toggleJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await Job.findOne({ _id: id, created_by: req.user.id });
    if (!job) return res.status(404).json("Job not found or unauthorized");
    
    job.status = job.status === 'open' ? 'closed' : 'open';
    await job.save();
    
    res.json({ message: "Job status updated", status: job.status });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json("Error updating job status");
  }
};

export const getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;
    
    // Try to find by ObjectId first, if fails, try as string
    let job;
    try {
      job = await Job.findById(jobId);
    } catch (castError) {
      // If ObjectId casting fails, try to find by a string field or return 404
      job = null;
    }
    
    if (!job) return res.status(404).json("Job not found");
    
    const total = await Application.countDocuments({ job_id: jobId });
    const accepted = await Application.countDocuments({ job_id: jobId, status: 'accepted' });
    
    const jobObj = job.toObject();
    jobObj.id = jobObj._id.toString(); // Add id field for frontend compatibility
    jobObj.application_stats = {
      total_applications: total,
      accepted_applications: accepted,
      acceptance_rate: total > 0 ? (accepted / total * 100).toFixed(1) : 0
    };
    
    res.json(jobObj);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json("Error fetching job");
  }
};

export const getJobPerformance = async (req, res) => {
  try {
    const jobId = req.params.id;
    const hrId = req.user.id;
    
    const job = await Job.findOne({ _id: jobId, created_by: hrId });
    if (!job) return res.status(403).json("Not authorized");
    
    const performance = await Application.aggregate([
      { $match: { job_id: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: "$job_id",
          total_applications: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "applied"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          avg_ats_score: { $avg: { $toDouble: "$ats_score" } },
          max_ats_score: { $max: { $toDouble: "$ats_score" } },
          min_ats_score: { $min: { $toDouble: "$ats_score" } }
        }
      }
    ]);

    const timeline = await Application.aggregate([
      { $match: { job_id: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          applications: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    const topSkills = await Application.aggregate([
      { $match: { job_id: new mongoose.Types.ObjectId(jobId) } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $match: { "user.skills": { $ne: null } } },
      {
        $group: {
          _id: "$user.skills",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const result = {
      ...job.toObject(),
      ...(performance[0] || {
        total_applications: 0,
        accepted: 0,
        pending: 0,
        rejected: 0,
        avg_ats_score: 0,
        max_ats_score: 0,
        min_ats_score: 0
      }),
      timeline: timeline.map(t => ({ date: t._id, applications: t.applications })),
      top_skills: topSkills.map(s => ({ skills: s._id, count: s.count }))
    };
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching job performance:", error);
    res.status(500).json("Error fetching job performance");
  }
};

export const getSimilarJobs = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json("Job not found");
    
    const firstSkill = job.required_skills ? job.required_skills.split(',')[0].trim() : "";
    
    const similarJobs = await Job.find({
      _id: { $ne: jobId },
      $or: [
        { required_skills: { $regex: firstSkill, $options: 'i' } },
        { job_role: { $regex: job.job_role, $options: 'i' } },
        { company_name: job.company_name }
      ]
    }).limit(5);
    
    res.json(similarJobs);
  } catch (error) {
    console.error("Error fetching similar jobs:", error);
    res.status(500).json("Error fetching similar jobs");
  }
};
