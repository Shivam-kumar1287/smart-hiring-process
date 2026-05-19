import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import crypto from 'crypto';

export const createMeeting = async (req, res) => {
  try {
    const { candidate_id, job_id, title, description, scheduled_at, duration, type, is_instant } = req.body;
    const hr_id = req.user.id;

    const meeting_link = `meeting-${crypto.randomUUID()}`;

    const meeting = await Meeting.create({
      title,
      description,
      hr_id,
      candidate_id,
      job_id,
      scheduled_at: is_instant ? new Date() : scheduled_at,
      duration,
      type,
      is_instant,
      meeting_link,
      status: is_instant ? 'accepted' : 'scheduled'
    });

    // In a real app, send email here
    // sendMeetingEmail(meeting, hr_id, candidate_id);

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

export const getMyMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const query = role === 'hr' ? { hr_id: userId } : { candidate_id: userId };
    const meetings = await Meeting.find(query)
      .populate('hr_id', 'name email profile_image')
      .populate('candidate_id', 'name email profile_image bio')
      .populate('job_id', 'title company')
      .sort({ scheduled_at: -1 });

    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};

export const updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status, message } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    meeting.status = status;
    if (status === 'accepted' || status === 'rejected' || status === 'reschedule_requested') {
        meeting.candidate_response = { status, message };
    }

    await meeting.save();
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

export const getMeetingByLink = async (req, res) => {
    try {
        const { link } = req.params;
        const meeting = await Meeting.findOne({ meeting_link: link })
            .populate('hr_id', 'name email profile_image')
            .populate('candidate_id', 'name email profile_image bio skills')
            .populate('job_id', 'title company');
        
        if (!meeting) return res.status(404).json({ error: "Meeting link invalid" });
        res.json(meeting);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch meeting" });
    }
};

export const saveSignal = async (req, res) => {
  try {
    const { link } = req.params;
    const { offer, answer, candidate, isCaller } = req.body;

    const meeting = await Meeting.findOne({ meeting_link: link });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    if (offer) meeting.offer = offer;
    if (answer) meeting.answer = answer;
    if (candidate) {
      if (isCaller) {
        meeting.callerCandidates.push(candidate);
      } else {
        meeting.calleeCandidates.push(candidate);
      }
    }

    await meeting.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Signaling update failed" });
  }
};

export const clearSignal = async (req, res) => {
  try {
    const { link } = req.params;
    const meeting = await Meeting.findOne({ meeting_link: link });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    meeting.offer = undefined;
    meeting.answer = undefined;
    meeting.callerCandidates = [];
    meeting.calleeCandidates = [];

    await meeting.save();
    res.json({ success: true, message: "Signals cleared" });
  } catch (error) {
    res.status(500).json({ error: "Signaling clear failed" });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    
    if (meeting.hr_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to delete this meeting" });
    }

    await Meeting.findByIdAndDelete(meetingId);
    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const { link } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    const meeting = await Meeting.findOne({ meeting_link: link })
      .populate('hr_id', 'name')
      .populate('candidate_id', 'name');
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    // Validate that user is either HR or Candidate of this meeting
    const isHr = meeting.hr_id._id.toString() === userId;
    const isCandidate = meeting.candidate_id._id.toString() === userId;
    if (!isHr && !isCandidate) {
      return res.status(403).json({ error: "Unauthorized to participate in this meeting chat" });
    }

    const senderName = isHr ? meeting.hr_id.name : meeting.candidate_id.name;
    const sender = isHr ? 'hr' : 'candidate';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    meeting.chatMessages.push({ sender, senderName, text, time });
    await meeting.save();

    res.json({ success: true, chatMessages: meeting.chatMessages });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
};

