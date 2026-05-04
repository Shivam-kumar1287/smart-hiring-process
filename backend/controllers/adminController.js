import User from "../models/userModel.js";
import Job from "../models/jobModel.js";

export const getStats = async (req, res) => {
  const userCount = await User.countDocuments();
  const jobCount = await Job.countDocuments();

  res.json({ users: userCount, jobs: jobCount });
};