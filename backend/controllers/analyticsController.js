import Application from "../models/applicationModel.js";
import Job from "../models/jobModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const applications = await Application.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const stats = {
      totalApplications: applications.reduce((sum, app) => sum + app.count, 0),
      pendingApplications: applications.find(app => app._id === 'pending')?.count || 0,
      acceptedApplications: applications.find(app => app._id === 'accepted')?.count || 0,
      rejectedApplications: applications.find(app => app._id === 'rejected')?.count || 0,
      savedJobs: 0 // Placeholder
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json("Error fetching user stats");
  }
};

export const getHRStats = async (req, res) => {
  try {
    const hrId = req.user.id;
    
    const totalJobs = await Job.countDocuments({ created_by: hrId });
    
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
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const stats = {
      totalJobs: totalJobs,
      totalApplications: applications.reduce((sum, app) => sum + app.count, 0),
      pendingApplications: applications.find(app => app._id === 'pending')?.count || 0,
      acceptedApplications: applications.find(app => app._id === 'accepted')?.count || 0,
      rejectedApplications: applications.find(app => app._id === 'rejected')?.count || 0,
      activeJobs: totalJobs
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching HR stats:", error);
    res.status(500).json("Error fetching HR stats");
  }
};

export const getJobAnalytics = async (req, res) => {
  try {
    const hrId = req.user.id;
    
    const jobAnalytics = await Job.aggregate([
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
          accepted: {
            $size: {
              $filter: {
                input: "$apps",
                as: "app",
                cond: { $eq: ["$$app.status", "accepted"] }
              }
            }
          },
          pending: {
            $size: {
              $filter: {
                input: "$apps",
                as: "app",
                cond: { $eq: ["$$app.status", "pending"] }
              }
            }
          },
          rejected: {
            $size: {
              $filter: {
                input: "$apps",
                as: "app",
                cond: { $eq: ["$$app.status", "rejected"] }
              }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    res.json(jobAnalytics);
  } catch (error) {
    console.error("Error fetching job analytics:", error);
    res.status(500).json("Error fetching job analytics");
  }
};

export const getApplicationTrends = async (req, res) => {
  try {
    const hrId = req.user.id;
    
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
    
    res.json(trends.map(t => ({ date: t._id, applications: t.applications })));
  } catch (error) {
    console.error("Error fetching application trends:", error);
    res.status(500).json("Error fetching application trends");
  }
};

export const getTopPerformingJobs = async (req, res) => {
  try {
    const hrId = req.user.id;
    
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
          acceptance_rate: {
            $cond: [
              { $gt: ["$total_applications", 0] },
              { $multiply: [{ $divide: ["$accepted_apps", "$total_applications"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { acceptance_rate: -1 } },
      { $limit: 5 }
    ]);
    
    res.json(topJobs);
  } catch (error) {
    console.error("Error fetching top performing jobs:", error);
    res.status(500).json("Error fetching top performing jobs");
  }
};

export const getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user applications as activity
    const appActivity = await Application.find({ user_id: userId })
      .populate('job_id')
      .sort({ createdAt: -1 })
      .limit(10);
      
    const activity = appActivity.map(app => ({
      type: 'application',
      created_at: app.createdAt,
      description: `Applied for ${app.job_id.job_role} at ${app.job_id.company_name}`
    }));
    
    // Sort and return
    res.json(activity.sort((a, b) => b.created_at - a.created_at));
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json("Error fetching user activity");
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    const userApps = await Application.find({ user_id: userId }).distinct('job_id');
    
    const recommendations = await Job.find({
      _id: { $nin: userApps },
      $or: [
        { required_skills: { $regex: user.skills || '', $options: 'i' } },
        { required_skills: { $regex: 'JavaScript', $options: 'i' } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5);
    
    res.json(recommendations);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json("Error fetching recommendations");
  }
};

