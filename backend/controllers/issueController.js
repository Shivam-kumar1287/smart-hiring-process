import Issue from "../models/issueModel.js";

export const reportIssue = async (req, res) => {
  const { message } = req.body;

  await Issue.create({
    reported_by: req.user.id,
    message
  });

  res.json("Issue reported");
};