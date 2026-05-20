import { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "", email: "", phone: "", location: "", bio: "", skills: "",
    social_links: []
  });

  const [stats, setStats] = useState({
    totalApplications: 0, pendingApplications: 0,
    acceptedApplications: 0, rejectedApplications: 0, savedJobs: 0
  });
  const [mcqData, setMcqData] = useState([]);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqForm, setMcqForm] = useState({
    jobRole: "", company: "", jd: "", count: 5, difficulty: "Intermediate"
  });
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [practiceMode, setPracticeMode] = useState("mcq"); // mcq or interview
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  const [interviewEvaluation, setInterviewEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const bypassTabSwitch = useRef(false);
  const recognitionRef = useRef(null);

  // Anti-cheat for Practice Mode
  useEffect(() => {
    const handleActivity = () => {
      if (bypassTabSwitch.current) return;
      if ((mcqData.length > 0 || interviewQuestions.length > 0) && !showResults && !interviewEvaluation) {
        setTabSwitches(prev => {
          const newVal = prev + 1;
          if (newVal >= 2) {
            bypassTabSwitch.current = true;
            alert("Practice session terminated due to multiple tab switches!");
            setMcqData([]);
            setInterviewQuestions([]);
            bypassTabSwitch.current = false;
            return 0;
          }
          bypassTabSwitch.current = true;
          alert(`Warning: Tab switch detected! Practice session will be cancelled if you switch again. (${newVal}/2)`);
          setTimeout(() => {
            bypassTabSwitch.current = false;
          }, 100);
          return newVal;
        });
      }
    };

    const handleVisibility = () => {
      if (document.hidden && !bypassTabSwitch.current) handleActivity();
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleActivity);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleActivity);
    };
  }, [mcqData, interviewQuestions, showResults, interviewEvaluation]);

  useEffect(() => {
    fetchUserProfile();
    fetchApplications();
    loadSavedJobs();
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchAssignedTests();
      fetchTestHistory();
    }
  }, [user]);

  const fetchMeetings = async () => {
    try {
      const res = await api.get("/meetings/my");
      setMeetings(res.data);
    } catch (err) {
      console.error("Error fetching meetings");
    }
  };

  const handleMeetingResponse = async (meetingId, status) => {
    try {
      await api.put(`/meetings/status/${meetingId}`, { status });
      fetchMeetings();
      alert(`Meeting invitation ${status} successfully!`);
    } catch (err) {
      alert("Failed to respond to invitation");
    }
  };

  const [assignedTests, setAssignedTests] = useState([]);
  const [testHistory, setTestHistory] = useState([]);
  const [meetings, setMeetings] = useState([]);

  const fetchTestHistory = async () => {
    try {
      const res = await api.get("/applications/my");
      let allSubmissions = [];
      for (const app of res.data) {
        if (!app.job_id) continue;
        try {
          // We need an endpoint to get all submissions for a user or search by app
          // Let's assume we can fetch by test results if we have the IDs
          // For now, let's just get the list of tests and see if there are submissions
          const jobId = app.job_id._id || app.job_id;
          const testsRes = await api.get(`/tests/job/${jobId}`);
          for (const test of testsRes.data) {
            if (user?._id) {
              try {
                const subRes = await api.get(`/tests/find?test_id=${test._id}&user_id=${user._id}`);
                if (subRes.data && subRes.data.status === 'submitted') {
                  allSubmissions.push({
                    ...subRes.data,
                    test_title: test.title,
                    show_marks: test.show_marks
                  });
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
      setTestHistory(allSubmissions);
    } catch (err) {}
  };

  const fetchAssignedTests = async () => {
    try {
      // We need an endpoint to get tests for the logged in user
      const res = await api.get("/applications/my");
      const jobIds = [...new Set(res.data.filter(app => app.job_id).map(app => app.job_id._id || app.job_id))];
      
      let allTests = [];
      for (const jobId of jobIds) {
        const testRes = await api.get(`/tests/job/${jobId}`);
        allTests = [...allTests, ...testRes.data];
      }
      
      // Filter tests by current round of application and check if already submitted
      const activeTests = [];
      for (const test of allTests) {
        const app = res.data.find(a => {
          if (!a.job_id) return false;
          const aJobId = a.job_id._id || a.job_id;
          const tJobId = test.job_id._id || test.job_id;
          return aJobId.toString() === tJobId.toString();
        });
        
        const isCorrectRound = app && (
          app.current_round.toString() === test.round_number.toString() ||
          (app.current_round === "0" && test.round_number === 1)
        );

        if (app && app.status === 'accepted' && isCorrectRound) {
          // Check if already submitted
          if (user?._id) {
            try {
              const subRes = await api.get(`/tests/find?test_id=${test._id}&user_id=${user._id}`);
              if (!subRes.data || (subRes.data.status !== 'submitted' && subRes.data.status !== 'cancelled')) {
                activeTests.push(test);
              }
            } catch (e) {
              activeTests.push(test);
            }
          } else {
             activeTests.push(test);
          }
        }
      }

      setAssignedTests(activeTests);
    } catch (err) {}
  };

  const fetchUserProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      const data = res.data;
      
      // Normalize skills
      const hardSkillsArr = Array.isArray(data.hard_skills) ? data.hard_skills : (data.hard_skills ? data.hard_skills.split(',').map(s => s.trim()).filter(s => s) : []);
      const softSkillsArr = Array.isArray(data.soft_skills) ? data.soft_skills : (data.soft_skills ? data.soft_skills.split(',').map(s => s.trim()).filter(s => s) : []);
      
      // Fallback for migration
      if (hardSkillsArr.length === 0 && softSkillsArr.length === 0 && data.skills) {
        if (Array.isArray(data.skills)) hardSkillsArr.push(...data.skills);
        else if (typeof data.skills === 'string') hardSkillsArr.push(...data.skills.split(',').map(s => s.trim()));
      }

      // Normalize social links
      let socialLinksArr = [];
      if (Array.isArray(data.social_links)) {
        socialLinksArr = data.social_links;
      } else if (typeof data.social_links === 'object' && data.social_links !== null) {
        socialLinksArr = Object.entries(data.social_links).map(([platform, url]) => ({ platform, url }));
      }

      const normalizedUser = { ...data, hard_skills: hardSkillsArr, soft_skills: softSkillsArr, social_links: socialLinksArr };
      setUser(normalizedUser);
      
      setProfileForm({
        name: data.name || "", email: data.email || "",
        phone: data.phone || "", location: data.location || "",
        bio: data.bio || "", 
        hard_skills: hardSkillsArr.join(', '),
        soft_skills: softSkillsArr.join(', '),
        social_links: socialLinksArr
      });
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        navigate("/");
      }
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get("/applications/my");
      setApplications(res.data);

      const st = {
        totalApplications: res.data.length,
        pendingApplications: res.data.filter(a => a.status === 'pending').length,
        acceptedApplications: res.data.filter(a => a.status === 'accepted').length,
        rejectedApplications: res.data.filter(a => a.status === 'rejected').length,
        savedJobs: JSON.parse(localStorage.getItem('savedJobs') || '[]').length
      };
      setStats(st);
    } catch (err) { }
  };

  const loadSavedJobs = async () => {
    const savedJobIds = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    const validIdRegex = /^[0-9a-fA-F]{24}$/;
    const filteredIds = savedJobIds.filter(id => typeof id === 'string' && validIdRegex.test(id));
    
    setStats(prev => ({ ...prev, savedJobs: filteredIds.length }));
    
    if (filteredIds.length !== savedJobIds.length) {
      console.log("Filtering out invalid job IDs from saved list");
      localStorage.setItem('savedJobs', JSON.stringify(filteredIds));
    }

    if (filteredIds.length === 0) {
      setSavedJobs([]);
      return;
    }

    const jobPromises = filteredIds.map(async (jobId) => {
      try {
        const res = await api.get(`/jobs/${jobId}`);
        return { ...res.data, saved: true };
      } catch (error) {
        if (error.response?.status === 404) {
          // If job not found, remove from localStorage
          const currentSaved = JSON.parse(localStorage.getItem('savedJobs') || '[]');
          const updated = currentSaved.filter(id => id !== jobId);
          localStorage.setItem('savedJobs', JSON.stringify(updated));
        }
        return null;
      }
    });

    const jobs = await Promise.all(jobPromises);
    setSavedJobs(jobs.filter(job => job !== null));
  };

  const unsaveJob = (jobId) => {
    const savedJobIds = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    const updatedIds = savedJobIds.filter(id => id !== jobId);
    localStorage.setItem('savedJobs', JSON.stringify(updatedIds));

    setSavedJobs(savedJobs.filter(job => job.id !== jobId));
    setStats(prev => ({ ...prev, savedJobs: updatedIds.length }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/profile", profileForm);
      setEditingProfile(false);
      fetchUserProfile();
    } catch (err) {
      alert("Error updating profile");
    }
  };

  const handleGenerateMCQs = async (e) => {
    e.preventDefault();
    setMcqLoading(true);
    setMcqData([]);
    setUserAnswers({});
    setShowResults(false);
    setTabSwitches(0);

    try {
      const res = await api.post("/mcq/generate", mcqForm);
      setMcqData(res.data);
    } catch (err) {
      alert("Failed to generate MCQs. Please try again.");
    } finally {
      setMcqLoading(false);
    }
  };

  const handleGenerateInterview = async (e) => {
    e.preventDefault();
    setMcqLoading(true);
    setInterviewQuestions([]);
    setInterviewAnswers([]);
    setCurrentQuestionIndex(0);
    setInterviewEvaluation(null);
    setTabSwitches(0);

    try {
      const res = await api.post("/interview/generate", mcqForm);
      setInterviewQuestions(res.data);
      speakQuestion(res.data[0].question);
    } catch (err) {
      console.error(err);
      alert("Failed to generate questions");
    } finally {
      setMcqLoading(false);
    }
  };

  const speakQuestion = (text) => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    synth.speak(utter);
  };

  const toggleListening = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = transcript ? transcript + " " : "";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      let interimTranscript = "";
      let newlyFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newlyFinal += event.results[i][0].transcript + " ";
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      finalTranscript += newlyFinal;
      setTranscript(finalTranscript + interimTranscript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const handleNextInterviewQuestion = () => {
    const newAnswers = [...interviewAnswers, { question: interviewQuestions[currentQuestionIndex].question, answer: transcript }];
    setInterviewAnswers(newAnswers);
    setTranscript("");

    if (currentQuestionIndex < interviewQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      speakQuestion(interviewQuestions[nextIndex].question);
    } else {
      evaluateFullInterview(newAnswers);
    }
  };

  const evaluateFullInterview = async (answers) => {
    setEvaluating(true);
    try {
      const evaluations = await Promise.all(
        answers.map(async (item) => {
          const res = await api.post("/interview/evaluate", {
            question: item.question,
            userAnswer: item.answer,
            jobRole: mcqForm.jobRole,
            difficulty: mcqForm.difficulty
          });
          return res.data;
        })
      );
      setInterviewEvaluation(evaluations);
    } catch (err) {
      console.error(err);
      alert("Failed to evaluate interview");
    } finally {
      setEvaluating(false);
    }
  };

  const handleAnswerSelect = (qIndex, answer) => {
    if (showResults) return;
    setUserAnswers({ ...userAnswers, [qIndex]: answer });
  };

  const calculateScore = () => {
    let score = 0;
    mcqData.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswer) score++;
    });
    return score;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
      case "accepted": return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "rejected": return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 sm:px-12 lg:px-16 py-8 -mt-6 animate-fadeIn">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{user?.name || 'User'}</span>!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Here's what's happening with your job search today.</p>
          </div>

          <button
            onClick={() => navigate("/jobs")}
            className="group relative z-10 inline-flex items-center justify-center px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:shadow-lg transition-all active:scale-95"
          >
            Explore Jobs
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar space-x-2 p-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8 max-w-fit">
          {["overview", "applications", "profile", "saved", "practice"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap active:scale-95 ${activeTab === tab
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm"
                }`}
            >
              <span className="relative">
                {tab}
                {tab === "overview" && assignedTests.length > 0 && (
                  <span className="absolute -top-2 -right-3 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-gray-900 animate-pulse"></span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="animate-fadeInUp">

          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Applications", val: stats.totalApplications, icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", borderColor: "border-blue-200 dark:border-blue-800" },
                  { label: "Pending Review", val: stats.pendingApplications, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", borderColor: "border-amber-200 dark:border-amber-800" },
                  { label: "Accepted", val: stats.acceptedApplications, icon: "M9 12l2 2 4-6m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", borderColor: "border-emerald-200 dark:border-emerald-800" },
                  { label: "Saved Roles", val: stats.savedJobs, icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30", borderColor: "border-purple-200 dark:border-purple-800" }
                ].map((stat, i) => (
                  <div key={i} className={`bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border ${stat.borderColor} transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group`}>
                    <div className="flex items-center justify-between z-10 relative">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                        <p className={`text-4xl font-black ${stat.color}`}>{stat.val}</p>
                      </div>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} /></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interviews Section */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Interview Invitations ({meetings.filter(m => m.status !== 'completed').length})
                </h3>
                {meetings.length === 0 ? (
                  <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center opacity-40">
                    <p className="text-sm font-bold uppercase tracking-widest">No interview requests at this time</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map(m => (
                      <div key={m._id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black">
                            {m.hr_id?.name ? m.hr_id.name[0] : "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate">{m.title}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">with {m.hr_id?.name || "Unknown Recruiter"}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                           <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {new Date(m.scheduled_at).toLocaleDateString()} at {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.duration} mins)
                           </div>
                           <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                              <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              {m.type === 'both' ? 'Audio + Video' : m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                           </div>
                        </div>

                        {m.status === 'scheduled' ? (
                          <div className="flex gap-2">
                             <button 
                               onClick={() => handleMeetingResponse(m._id, 'accepted')}
                               className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-500 transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                             >
                               Accept
                             </button>
                             <button 
                               onClick={() => handleMeetingResponse(m._id, 'rejected')}
                               className="px-4 py-2 bg-white dark:bg-gray-900 text-rose-600 text-[10px] font-black rounded-xl border border-rose-100 dark:border-rose-900/50 hover:bg-rose-50 transition-all uppercase tracking-widest"
                             >
                               Reject
                             </button>
                          </div>
                        ) : m.status === 'accepted' ? (
                          <button 
                            onClick={() => navigate(`/meeting/${m.meeting_link}`)}
                            className="w-full py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20"
                          >
                            Join Live Room
                          </button>
                        ) : (
                          <div className="py-2 text-center bg-gray-100 dark:bg-gray-800 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                            Invitation {m.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {assignedTests.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                    Pending Assessments ({assignedTests.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assignedTests.map(test => (
                      <div key={test._id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border-2 border-blue-100 dark:border-blue-900/30 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Round {test.round_number}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mb-1">{test.title}</h4>
                        <p className="text-sm text-gray-500 mb-4">{test.duration} Minutes • {test.questions.length} Questions</p>
                        
                        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                          <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Deadline</p>
                            <p className="text-xs font-bold">{new Date(test.end_time).toLocaleString()}</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => navigate(`/take-test/${test._id}`)}
                          className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                        >
                          Start Assessment
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testHistory.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-6m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Completed Assessments ({testHistory.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {testHistory.map(sub => (
                      <div key={sub._id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-bold">{sub.test_title}</h4>
                            <p className="text-xs text-gray-500">Submitted on {new Date(sub.submitted_at).toLocaleDateString()}</p>
                          </div>
                          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase">Completed</span>
                        </div>
                        
                        {sub.show_marks ? (
                          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Score</p>
                              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{sub.total_score} / {sub.max_score}</p>
                            </div>
                            <button 
                              onClick={() => navigate(`/test-results/${sub._id}`)}
                              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                              View Details
                            </button>
                          </div>
                        ) : (
                          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              Results are hidden by HR
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {activeTab === "applications" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Application History
              </h2>

              {applications.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">Your application history is empty.</p>
                  <button onClick={() => navigate("/jobs")} className="px-6 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 font-medium rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-md">Find a Job</button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {applications.map((app) => (
                    <div key={app.id} className="relative p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">{app.job_role}</h3>
                          <p className="text-gray-600 dark:text-gray-400 font-medium mb-3">{app.company_name}</p>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Applied on {new Date(app.createdAt || app.created_at).toLocaleDateString()}
                          </div>

                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Placement Progress</span>
                              <div className="flex items-center gap-2 mt-1.5">
                                {[...Array(parseInt(app.rounds || 1))].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all shadow-sm ${(app.current_round || 0) > i
                                        ? "bg-emerald-500 text-white"
                                        : (app.current_round || 0) === i
                                          ? "bg-amber-400 text-white ring-2 ring-amber-400/30 animate-pulse"
                                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700"
                                      }`}
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                                <p className="text-[11px] font-bold ml-2 text-gray-500 dark:text-gray-400">
                                  {(app.current_round || 0) >= app.rounds ? "Final Stage" : `Round ${app.current_round || 0} of ${app.rounds || 1}`}
                                </p>
                              </div>
                            </div>
                          </div>

                          {app.ats_score && (
                            <div className="mt-4 max-w-sm">
                              <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Resume Match Score</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{app.ats_score}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden border border-gray-300 dark:border-gray-600">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${app.ats_score}%` }} />
                              </div>

                              {app.ats_explanation && (
                                <div className="mt-4 p-3.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl relative overflow-hidden group">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Match Analysis
                                  </p>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">"{app.ats_explanation}"</p>
                                </div>
                              )}

                              {app.ats_suggestions && (
                                <div className="mt-3 p-3.5 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-950 rounded-xl relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Improvement Path
                                  </p>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-medium">
                                    {app.ats_suggestions}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex md:flex-col items-center justify-between border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                          <span className={`px-4 py-1.5 border rounded-full text-sm font-bold uppercase tracking-wide ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Profile Information
                </h2>
                {!editingProfile && (
                  <button onClick={() => setEditingProfile(true)} className="px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white font-medium flex items-center gap-2 rounded-xl transition-all active:scale-95 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit Profile
                  </button>
                )}
              </div>

              {editingProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name</label>
                      <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                      <input type="email" value={profileForm.email} disabled className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 rounded-xl cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                      <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</label>
                      <input type="text" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                    <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none h-32 resize-none" placeholder="Tell companies about yourself..." />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Social Media & Portfolio Links</label>
                      <button
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, social_links: [...(profileForm.social_links || []), { platform: "", url: "" }] })}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        Add New Link
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(Array.isArray(profileForm.social_links) ? profileForm.social_links : []).map((link, index) => (
                        <div key={index} className="flex gap-2 items-center animate-fadeIn">
                          <input
                            placeholder="Platform"
                            value={link.platform}
                            onChange={(e) => {
                              const newLinks = [...profileForm.social_links];
                              newLinks[index].platform = e.target.value;
                              setProfileForm({ ...profileForm, social_links: newLinks });
                            }}
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none"
                          />
                          <input
                            placeholder="URL"
                            value={link.url}
                            onChange={(e) => {
                              const newLinks = [...profileForm.social_links];
                              newLinks[index].url = e.target.value;
                              setProfileForm({ ...profileForm, social_links: newLinks });
                            }}
                            className="flex-[2] px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newLinks = profileForm.social_links.filter((_, i) => i !== index);
                              setProfileForm({ ...profileForm, social_links: newLinks });
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all active:scale-95 hover:shadow-blue-500/25">Save Changes</button>
                    <button type="button" onClick={() => setEditingProfile(false)} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-medium rounded-xl transition-all active:scale-95">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Full Name</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Location</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.location || "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Professional Bio</p>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">{user?.bio || "No bio added yet."}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Hard Skills</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Array.isArray(user?.hard_skills) && user.hard_skills.length > 0 ? user.hard_skills.map((s, i) => (
                          <span key={i} className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold border border-blue-200 dark:border-blue-800/50">{s.trim()}</span>
                        )) : <p className="text-gray-500 italic text-sm">No hard skills listed</p>}
                      </div>
                      
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Soft Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(user?.soft_skills) && user.soft_skills.length > 0 ? user.soft_skills.map((s, i) => (
                          <span key={i} className="px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-semibold border border-emerald-200 dark:border-emerald-800/50">{s.trim()}</span>
                        )) : <p className="text-gray-500 italic text-sm">No soft skills listed</p>}
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Social Links</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.isArray(user?.social_links) && user.social_links.length > 0 ? user.social_links.map((link, i) => (
                          <a
                            key={i}
                            href={(link.url || "").startsWith('http') ? link.url : `https://${link.url || ""}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md transition-all group"
                          >
                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {link.platform?.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{link.platform}</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{(link.url || "").replace(/^https?:\/\//i, '')}</p>
                            </div>
                          </a>
                        )) : <p className="text-gray-400 italic text-sm">No links added.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "saved" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  Saved Jobs
                </h2>
                <button onClick={() => navigate("/jobs")} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 font-medium rounded-xl shadow-sm transition-colors text-sm">
                  Browse More Jobs
                </button>
              </div>

              {savedJobs.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Saved Jobs Yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">Keep track of interesting roles by saving them while you browse.</p>
                  <button onClick={() => navigate("/jobs")} className="px-6 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 font-medium rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-md">
                    Discover Opportunities
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {savedJobs.map((job) => (
                    <div key={job.id} className="relative p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{job.job_role}</h3>
                            {job.status === 'closed' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800">Closed</span>
                            )}
                          </div>
                          <p className="text-blue-600 dark:text-blue-400 font-medium mb-3">{job.company_name}</p>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 text-sm">{job.description}</p>

                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium">
                              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                              {job.required_skills}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium">
                              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {job.rounds} Rounds
                            </span>
                          </div>
                        </div>

                        <div className="flex md:flex-col justify-center gap-3 md:min-w-[140px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                          {job.status === 'open' ? (
                            <button onClick={() => navigate(`/apply/${job.id}`)} className="flex-1 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-center text-sm shadow-sm hover:shadow-md">
                              Apply Now
                            </button>
                          ) : (
                            <button disabled className="flex-1 w-full px-4 py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-500 font-medium rounded-xl text-center text-sm cursor-not-allowed">
                              Closed
                            </button>
                          )}
                          <button onClick={() => unsaveJob(job.id)} className="flex-1 w-full px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-medium rounded-xl transition-colors text-center text-sm border border-transparent hover:border-rose-200 dark:hover:border-rose-800">
                            Unsave Job
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "practice" && (
            <div className="space-y-8">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    AI Practice Center
                  </h2>
                  
                  <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full md:w-auto">
                    <button 
                      onClick={() => setPracticeMode("mcq")}
                      className={`flex-1 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${practiceMode === 'mcq' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      MCQ Quiz
                    </button>
                    <button 
                      onClick={() => setPracticeMode("interview")}
                      className={`flex-1 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${practiceMode === 'interview' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Virtual Interview
                    </button>
                  </div>
                </div>

                {mcqData.length === 0 && interviewQuestions.length === 0 && (
                  <form onSubmit={practiceMode === 'mcq' ? handleGenerateMCQs : handleGenerateInterview} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Role</label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer"
                        value={mcqForm.jobRole}
                        onChange={(e) => setMcqForm({ ...mcqForm, jobRole: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Company</label>
                      <input
                        type="text"
                        placeholder="e.g. Google"
                        value={mcqForm.company}
                        onChange={(e) => setMcqForm({ ...mcqForm, company: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Description (optional)</label>
                      <textarea
                        placeholder="Paste JD here for more tailored questions..."
                        value={mcqForm.jd}
                        onChange={(e) => setMcqForm({ ...mcqForm, jd: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Number of Questions</label>
                      <select
                        value={mcqForm.count}
                        onChange={(e) => setMcqForm({ ...mcqForm, count: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Difficulty Level</label>
                      <select
                        value={mcqForm.difficulty}
                        onChange={(e) => setMcqForm({ ...mcqForm, difficulty: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        {["Beginner", "Intermediate", "Advanced", "Expert"].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 pt-2">
                      <button
                        type="submit"
                        disabled={mcqLoading}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {mcqLoading ? "Initializing..." : `Start ${practiceMode === 'mcq' ? 'MCQ Quiz' : 'Virtual Interview'}`}
                      </button>
                    </div>
                  </form>
                )}

                {/* MCQ Mode UI */}
                {practiceMode === 'mcq' && mcqData.length > 0 && (
                  <div className="space-y-8 animate-fadeInUp mt-4">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <h3 className="font-bold text-gray-700 dark:text-gray-300">MCQ Practice Session</h3>
                      {showResults && (
                        <div className="px-6 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-black">
                          Score: {calculateScore()} / {mcqData.length}
                        </div>
                      )}
                    </div>

                    <div className="space-y-10">
                      {mcqData.map((q, qIndex) => (
                        <div key={qIndex} className="space-y-4">
                          <p className="text-lg font-semibold flex gap-3">
                            <span className="text-indigo-500">Q{qIndex + 1}.</span>
                            {q.question}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {q.options.map((option, oIndex) => {
                              const isSelected = userAnswers[qIndex] === option;
                              const isCorrect = q.correctAnswer === option;
                              const showSuccess = showResults && isCorrect;
                              const showDanger = showResults && isSelected && !isCorrect;

                              return (
                                <button
                                  key={oIndex}
                                  onClick={() => handleAnswerSelect(qIndex, option)}
                                  disabled={showResults}
                                  className={`p-4 text-left rounded-2xl border transition-all ${showSuccess
                                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                                      : showDanger
                                        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-300"
                                        : isSelected
                                          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                                          : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                                    }`}
                                >
                                  <span className="font-bold mr-2">{String.fromCharCode(65 + oIndex)}.</span>
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          {showResults && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-sm animate-fadeIn">
                              <p className="font-bold text-blue-700 dark:text-blue-300 mb-1">Explanation:</p>
                              <p className="text-gray-700 dark:text-gray-300">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {!showResults ? (
                      <button
                        onClick={() => setShowResults(true)}
                        disabled={Object.keys(userAnswers).length < mcqData.length}
                        className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-8"
                      >
                        Submit Answers
                      </button>
                    ) : (
                      <button
                        onClick={() => { setMcqData([]); setShowResults(false); setUserAnswers({}); }}
                        className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-bold rounded-2xl shadow-sm transition-all active:scale-[0.98] mt-8"
                      >
                        Try New Quiz
                      </button>
                    )}
                  </div>
                )}

                {/* Virtual Interview UI */}
                {practiceMode === 'interview' && interviewQuestions.length > 0 && !interviewEvaluation && (
                  <div className="max-w-3xl mx-auto py-12 text-center space-y-12 animate-fadeIn">
                    <div className="space-y-4">
                      <div className="inline-flex items-center px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-widest">
                        Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                      </div>
                      <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                        {interviewQuestions[currentQuestionIndex].question}
                      </h3>
                    </div>

                    <div className="relative inline-flex flex-col items-center">
                      <div className={`absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse ${isRecording ? 'scale-150' : 'scale-100'}`}></div>
                      <button 
                        onClick={toggleListening}
                        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 ${isRecording ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}
                      >
                        {isRecording ? (
                          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                        ) : (
                          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                        )}
                      </button>
                      <span className="mt-6 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-500 dark:text-gray-400 rounded-full shadow-sm">
                         {isRecording ? "Click to Stop Speaking" : "Click to Start Speaking"}
                      </span>
                    </div>

                    <div className="space-y-6">
                      <textarea 
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Click the microphone and start speaking your answer..."
                        className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 min-h-[150px] max-h-[300px] text-gray-700 dark:text-gray-300 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed text-left"
                      />

                      <button 
                        onClick={handleNextInterviewQuestion}
                        disabled={!transcript || evaluating}
                        className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {evaluating ? "Evaluating..." : currentQuestionIndex === interviewQuestions.length - 1 ? "Finish Interview" : "Submit & Next Question"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Interview Results UI */}
                {interviewEvaluation && (
                  <div className="space-y-12 animate-fadeInUp">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mx-auto flex items-center justify-center">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-6m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white">Interview Summary</h3>
                      <p className="text-gray-500 dark:text-gray-400">Great job! Here's how you performed in your virtual session.</p>
                    </div>

                    <div className="grid gap-8">
                      {interviewEvaluation.map((res, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 space-y-6">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Question {i + 1}</p>
                              <h4 className="text-xl font-bold text-gray-900 dark:text-white">{interviewAnswers[i]?.question}</h4>
                            </div>
                            <div className={`px-4 py-2 rounded-2xl font-black text-xl shadow-sm ${res.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {res.score}/10
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Answer</p>
                              <p className="text-gray-700 dark:text-gray-300 italic">"{interviewAnswers[i]?.answer}"</p>
                            </div>
                            
                            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                Ideal Answer
                              </p>
                              <p className="text-gray-700 dark:text-gray-300 font-medium">{res.idealAnswer}</p>
                            </div>

                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                Feedback
                              </p>
                              <p className="text-gray-700 dark:text-gray-300">{res.feedback}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => { setInterviewQuestions([]); setInterviewEvaluation(null); setInterviewAnswers([]); }}
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-indigo-500/25 transition-all active:scale-[0.98]"
                    >
                      Restart Practice
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}