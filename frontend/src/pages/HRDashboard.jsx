import { useState, useEffect } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingData, setMeetingData] = useState({
    candidate_id: "",
    job_id: "",
    title: "",
    description: "",
    scheduled_at: "",
    end_time: "",
    duration: 30,
    type: "both",
    is_instant: false
  });
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0, totalApplications: 0, 
    pendingApplications: 0, acceptedApplications: 0, 
    rejectedApplications: 0, activeJobs: 0
  });
  const [processing, setProcessing] = useState(false);

  const [jobForm, setJobForm] = useState({
    company_name: "", job_role: "", description: "", required_skills: "", rounds: ""
  });
  const [jobSearch, setJobSearch] = useState("");
  const [appSearch, setAppSearch] = useState("");
  const [jobTests, setJobTests] = useState({}); // { jobId: [tests] }
  const [testSubmissions, setTestSubmissions] = useState([]);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
    fetchMeetings();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get("/jobs/my");
      setJobs(res.data);
      await calculateStats(res.data, applications);
    } catch (err) {}
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get("/applications");
      setApplications(res.data);
      await calculateStats(jobs, res.data);
    } catch (err) {}
  };

  const fetchMeetings = async () => {
    try {
      const res = await api.get("/meetings/my");
      setMeetings(res.data);
    } catch (err) {}
  };

  const calculateStats = async (jobsData, applicationsData) => {
    const s = {
      totalJobs: jobsData.length,
      totalApplications: applicationsData.length,
      pendingApplications: applicationsData.filter(app => app.status === 'pending').length,
      acceptedApplications: applicationsData.filter(app => app.status === 'accepted').length,
      rejectedApplications: applicationsData.filter(app => app.status === 'rejected').length,
      activeJobs: jobsData.length
    };
    setStats(s);
    
    // Fetch tests for all jobs
    try {
      const subRes = await api.get("/tests/submissions");
      setTestSubmissions(subRes.data);
      
      const scores = subRes.data.filter(s => s.status === 'submitted').map(s => (s.total_score / s.max_score) * 100);
      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      setStats(prev => ({ ...prev, avgScore: avg }));
    } catch (e) {}

    for (const job of jobsData) {
      try {
        const res = await api.get(`/tests/job/${job._id}`);
        setJobTests(prev => ({ ...prev, [job._id]: res.data }));
      } catch (e) {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingJob) {
        await api.put(`/jobs/${editingJob.id}`, jobForm);
      } else {
        await api.post("/jobs", jobForm);
      }
      setShowJobForm(false);
      setEditingJob(null);
      setJobForm({ company_name: "", job_role: "", description: "", required_skills: "", rounds: "" });
      fetchJobs();
    } catch (err) {
      alert("Error saving job");
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      let finalMeetingData = { ...meetingData };
      if (!meetingData.is_instant) {
        if (!meetingData.scheduled_at || !meetingData.end_time) {
          alert("Please select both start time and end time.");
          return;
        }
        const start = new Date(meetingData.scheduled_at);
        const end = new Date(meetingData.end_time);
        if (end <= start) {
          alert("End time must be after start time.");
          return;
        }
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        finalMeetingData.duration = diffMins;
      }
      await api.post("/meetings/create", finalMeetingData);
      setShowMeetingModal(false);
      fetchMeetings();
      alert(meetingData.is_instant ? "Meeting room created! Candidate has been notified." : "Interview scheduled successfully!");
    } catch (err) {
      alert("Failed to create meeting");
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (confirm("Are you sure you want to cancel and delete this interview invitation?")) {
      try {
        await api.delete(`/meetings/${meetingId}`);
        fetchMeetings();
        alert("Interview invitation cancelled successfully.");
      } catch (err) {
        alert("Failed to cancel interview: " + (err.response?.data?.error || "Unknown error"));
      }
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setJobForm(job);
    setShowJobForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this job?")) {
      try {
        await api.delete(`/jobs/${id}`);
        fetchJobs();
      } catch (err) { }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.put(`/jobs/${id}/toggle-status`);
      fetchJobs();
    } catch (err) {
      alert("Error toggling job status");
    }
  };

  const handleApplicationAction = async (appId, action) => {
    if (processing) return;
    setProcessing(true);
    try {
      await api.put(`/applications/${appId}/${action}`);
      await fetchApplications();
    } catch (err) {
      alert("Error performing action: " + (err.response?.data || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleRoundUpdate = async (appId, newRound) => {
    if (processing) return;
    setProcessing(true);
    try {
      await api.put(`/applications/${appId}/round`, { round: newRound });
      await fetchApplications();
    } catch (err) {
      alert("Error updating round");
    } finally {
      setProcessing(false);
    }
  };
  const handlePromote = async (appId) => {
    if (processing) return;
    setProcessing(true);
    try {
      await api.put(`/applications/${appId}/promote`);
      await fetchApplications();
      // Also refresh stats/reports
      const res = await api.get("/jobs/my");
      await calculateStats(res.data, applications);
      alert("Candidate promoted to the next round!");
    } catch (err) {
      alert("Error promoting candidate");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectAssessment = async (appId) => {
    if (!window.confirm("Are you sure you want to reject this candidate based on their assessment?")) return;
    if (processing) return;
    setProcessing(true);
    try {
      await api.put(`/applications/${appId}/reject-assessment`);
      await fetchApplications();
      // Also refresh stats/reports
      const res = await api.get("/jobs/my");
      await calculateStats(res.data, applications);
      alert("Candidate rejected.");
    } catch (err) {
      alert("Error rejecting candidate");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-6 sm:px-12 lg:px-16 py-8 -mt-6 animate-fadeIn">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">
              HR Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Manage your job postings and applicants efficiently.</p>
          </div>
          
          <div className="relative z-10 flex space-x-3">
            <button onClick={() => navigate("/profile")} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium rounded-xl transition-all">Profile</button>
            <button onClick={() => { localStorage.removeItem("token"); navigate("/"); }} className="px-6 py-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 font-medium rounded-xl transition-all">Logout</button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar space-x-2 p-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8 max-w-fit">
          {["overview", "jobs", "applications", "members", "reports", "interviews"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {tab === "jobs" ? `Manage Jobs (${jobs.length})` : tab === "applications" ? `Applicants (${applications.length})` : tab === "members" ? `Members (${applications.length})` : tab === "reports" ? "Assessment Reports" : tab === "interviews" ? `Interviews (${meetings.length})` : tab}
            </button>
          ))}

        </div>

        {/* Content Area */}
        <div className="animate-fadeInUp">
          
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: "Active Jobs Postings", val: stats.totalJobs, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30", borderColor: "border-purple-200 dark:border-purple-800" },
                { label: "Total Applications", val: stats.totalApplications, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", borderColor: "border-emerald-200 dark:border-emerald-800" },
                { label: "Pending Reviews", val: stats.pendingApplications, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", borderColor: "border-amber-200 dark:border-amber-800" },
              ].map((stat, i) => (
                <div key={i} className={`bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border ${stat.borderColor} transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-5xl font-black ${stat.color}`}>{stat.val}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "jobs" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Job Listings</h2>
                <div className="flex w-full md:w-auto gap-3">
                  <div className="relative flex-1 md:w-64">
                    <input 
                      type="text" 
                      placeholder="Search jobs..." 
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  {!showJobForm && (
                    <button onClick={() => setShowJobForm(true)} className="px-5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 font-medium rounded-xl transition-colors whitespace-nowrap">
                      + Create
                    </button>
                  )}
                </div>
              </div>

              {showJobForm && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 animate-slideInUp">
                  <h3 className="text-xl font-bold mb-4">{editingJob ? "Edit Job Posting" : "Create New Job Posting"}</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Company Name" value={jobForm.company_name} onChange={(e) => setJobForm({...jobForm, company_name: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" required />
                      <input type="text" placeholder="Job Title" value={jobForm.job_role} onChange={(e) => setJobForm({...jobForm, job_role: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" required />
                    </div>
                    <textarea placeholder="Job Description" value={jobForm.description} onChange={(e) => setJobForm({...jobForm, description: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Required Skills (comma separated)" value={jobForm.required_skills} onChange={(e) => setJobForm({...jobForm, required_skills: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" required />
                      <input type="text" placeholder="Interview Rounds (e.g., 3)" value={jobForm.rounds} onChange={(e) => setJobForm({...jobForm, rounds: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" required />
                    </div>
                    <div className="flex space-x-3 pt-2">
                       <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:shadow-lg transition-transform active:scale-95">{editingJob ? "Update Job" : "Publish Job"}</button>
                       <button type="button" onClick={() => { setShowJobForm(false); setEditingJob(null); setJobForm({company_name: "", job_role: "", description: "", required_skills: "", rounds: ""}); }} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {jobs.length === 0 && !showJobForm ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">No jobs posted yet. Create your first job posting!</div>
              ) : (
                <div className="grid gap-4">
                  {jobs.filter(j => 
                    j.job_role.toLowerCase().includes(jobSearch.toLowerCase()) || 
                    j.company_name.toLowerCase().includes(jobSearch.toLowerCase()) ||
                    j.required_skills.toLowerCase().includes(jobSearch.toLowerCase())
                  ).map((job) => (
                    <div key={job.id} className="p-5 border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{job.job_role}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${job.status === 'closed' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>{job.status === 'closed' ? 'Closed' : 'Open'}</span>
                          </div>
                          <p className="text-purple-600 dark:text-purple-400 font-medium mb-2">{job.company_name}</p>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                            <span className="bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">Skills: {job.required_skills}</span>
                            <span className="bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300">{job.rounds} Rounds</span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${job.applicant_count > 0 ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                              {job.applicant_count} {job.applicant_count === 1 ? 'Applicant' : 'Applicants'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {job.applicant_count > 0 && (
                            <button 
                              onClick={() => { setAppSearch(job.job_role); setActiveTab("applications"); }}
                              className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                            >
                              View Applicants
                            </button>
                          )}
                          <button 
                            onClick={() => navigate(`/create-test/${job.id}`)}
                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                          >
                            Add Test
                          </button>
                          <button onClick={() => handleToggleStatus(job.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${job.status === 'closed' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40'}`}>
                            {job.status === 'closed' ? 'Reopen Job' : 'Close Job'}
                          </button>
                          <button onClick={() => handleEdit(job)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Edit</button>
                          <button onClick={() => handleDelete(job.id)} className="px-4 py-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">Delete</button>
                        </div>
                      </div>

                      {/* Test Management Section */}
                      {jobTests[job._id]?.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 animate-fadeIn">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Active Assessments
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {jobTests[job._id].sort((a,b) => a.round_number - b.round_number).map(test => (
                              <div key={test._id} className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-black text-xs">
                                  {test.round_number}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white">{test.title}</p>
                                  <p className="text-[9px] text-gray-500 font-medium">{new Date(test.start_time).toLocaleDateString()} - {new Date(test.end_time).toLocaleDateString()}</p>
                                </div>
                                <button 
                                  onClick={async () => {
                                    if(confirm(`Are you sure you want to delete the test for Round ${test.round_number}? This will also delete all candidate submissions for this test.`)) {
                                      try {
                                        await api.delete(`/tests/${test._id}`);
                                        // Refresh tests for this job
                                        const res = await api.get(`/tests/job/${job._id}`);
                                        setJobTests(prev => ({ ...prev, [job._id]: res.data }));
                                      } catch (e) {
                                        alert("Failed to delete test");
                                      }
                                    }
                                  }}
                                  className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  title="Delete Assessment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Applicant Pipeline</h2>
                 <div className="relative w-full md:w-64">
                    <input 
                      type="text" 
                      placeholder="Search applicants..." 
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </div>
               </div>
               
               {applications.length === 0 ? (
                 <div className="text-center py-12 text-gray-500 dark:text-gray-400 border border-dashed rounded-xl border-gray-200 dark:border-gray-700">No applicants pending review at the moment.</div>
               ) : (
                 <div className="grid gap-6">
                   {applications.filter(a => 
                     a.user_name?.toLowerCase().includes(appSearch.toLowerCase()) || 
                     a.job_role?.toLowerCase().includes(appSearch.toLowerCase()) ||
                     a.user_email?.toLowerCase().includes(appSearch.toLowerCase())
                   ).map((app) => (
                     <div key={app.id} className="relative p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                       <div className="flex flex-col md:flex-row justify-between gap-6">
                         <div className="flex-1">
                           <div className="flex justify-between items-start">
                             <div>
                               <h3 className="text-xl font-bold text-gray-900 dark:text-white">{app.job_role}</h3>
                               <p className="text-purple-600 dark:text-purple-400 font-medium mb-1">Applicant: {app.user_name} ({app.user_email})</p>
                               <div className="flex flex-wrap gap-2 mb-4">
                                  {(Array.isArray(app.social_links) ? app.social_links : []).map((link, i) => (
                                    <a 
                                      key={i} 
                                      href={(link.url || "").startsWith('http') ? link.url : `https://${link.url || ""}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all"
                                      title={link.platform}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                      <span className="text-[10px] font-bold uppercase tracking-tight">{link.platform}</span>
                                    </a>
                                  ))}
                               </div>
                             </div>
                             <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${
                                app.status === 'accepted' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                app.status === 'rejected' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800' :
                                'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                             }`}>
                               {app.status}
                             </span>
                           </div>
                           
                           <div className="flex items-center gap-4 mb-4">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Round</span>
                               <div className="flex items-center gap-2 mt-1">
                                 {[...Array(parseInt(app.rounds || 1))].map((_, i) => (
                                   <button
                                     key={i}
                                     onClick={() => handleRoundUpdate(app.id, i + 1)}
                                     disabled={processing}
                                     className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                                       processing ? "opacity-50 cursor-not-allowed" : ""
                                     } ${(app.current_round || 0) > i 
                                         ? "bg-emerald-500 text-white shadow-sm" 
                                         : (app.current_round || 0) === i 
                                           ? "bg-amber-400 text-white animate-pulse" 
                                           : "bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700"
                                     }`}
                                     title={`Move to Round ${i + 1}`}
                                   >
                                     {i + 1}
                                   </button>
                                 ))}
                                 <span className="text-xs font-medium text-gray-500 ml-1">of {app.rounds || 1}</span>
                               </div>
                             </div>
                           </div>
                           
                           <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mt-2">
                             <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Cover Letter</p>
                             <p className="text-gray-700 dark:text-gray-300 italic">"{app.cover_letter}"</p>
                           </div>
                           
                           <div className={`mt-4 max-w-sm flex items-center justify-between px-4 py-2 rounded-lg border flex-1 ${
                                app.ats_score >= 75 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" :
                                app.ats_score >= 50 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" :
                                "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                           }`}>
                              <div className="flex flex-col">
                                <span className={`font-semibold text-sm ${
                                  app.ats_score >= 75 ? "text-emerald-800 dark:text-emerald-300" : 
                                  app.ats_score >= 50 ? "text-amber-800 dark:text-amber-300" : 
                                  "text-rose-800 dark:text-rose-300"
                                }`}>Resume Match Score</span>
                                <span className="text-xs text-gray-500">Criteria Match Evaluation</span>
                              </div>
                              <span className={`text-2xl font-black ${
                                app.ats_score >= 75 ? "text-emerald-600 dark:text-emerald-400" : 
                                app.ats_score >= 50 ? "text-amber-600 dark:text-amber-400" : 
                                "text-rose-600 dark:text-rose-400"
                              }`}>{app.ats_score || "0"}%</span>
                           </div>
                           
                            {app.ats_explanation && (
                              <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-950 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  AI Match Analysis
                                </p>
                                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                  {app.ats_explanation}
                                </p>
                              </div>
                            )}

                            {app.ats_suggestions && (
                              <div className="mt-3 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-950 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                  Improvement Suggestions
                                </p>
                                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                  {app.ats_suggestions}
                                </p>
                              </div>
                            )}

                            {/* View Test Results Button */}
                            {app.status === 'accepted' && (
                              <div className="mt-4 flex gap-3">
                                <button 
                                  onClick={async () => {
                                    try {
                                      const testsRes = await api.get(`/tests/job/${app.job_id}`);
                                      const currentTest = testsRes.data.find(t => t.round_number.toString() === app.current_round);
                                      if (currentTest) {
                                        try {
                                          const subRes = await api.get(`/tests/find?test_id=${currentTest._id}&user_id=${app.user_id}`);
                                          navigate(`/test-results/${subRes.data._id}`);
                                        } catch (e) {
                                          alert("Candidate has not started the test yet.");
                                        }
                                      } else {
                                        if(confirm("No test assigned for this round. Would you like to create one now?")) {
                                          navigate(`/create-test/${app.job_id}`);
                                        }
                                      }
                                    } catch (err) {
                                      alert("Error checking test status");
                                    }
                                  }}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                                >
                                  View Assessment Results
                                </button>
                              </div>
                            )}


                            {app.resume_path && (
                              <div className="mt-3 flex items-center gap-4">
                                <a href={`http://localhost:5000/${app.resume_path.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                  View Resume
                                </a>
                                <button 
                                  onClick={() => {
                                    setMeetingData({ 
                                      ...meetingData, 
                                      candidate_id: app.user_id, 
                                      job_id: app.job_id, 
                                      title: `Interview for ${app.job_role}`,
                                      scheduled_at: "",
                                      end_time: "",
                                      duration: 30,
                                      is_instant: false
                                    });
                                    setShowMeetingModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  Schedule
                                </button>
                                <button 
                                  onClick={() => setSelectedApplicant(app)}
                                  className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  Candidate Profile
                                </button>
                              </div>
                            )}
                         </div>
                         {app.status === 'pending' && (
                           <div className="flex md:flex-col justify-center gap-3 md:min-w-[140px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                             <button onClick={() => handleApplicationAction(app.id, "accept")} disabled={processing} className={`flex-1 w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors text-center ${processing ? "opacity-50 cursor-not-allowed" : ""}`}>Approve</button>
                             <button onClick={() => handleApplicationAction(app.id, "reject")} disabled={processing} className={`flex-1 w-full px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-xl transition-colors text-center ${processing ? "opacity-50 cursor-not-allowed" : ""}`}>Reject</button>
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">All Members</h2>
              
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Members Found</h3>
                  <p className="text-gray-500 dark:text-gray-500">No members have applied for jobs yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.filter(a => 
                    a.user_name?.toLowerCase().includes(appSearch.toLowerCase()) || 
                    a.job_role?.toLowerCase().includes(appSearch.toLowerCase()) ||
                    a.user_email?.toLowerCase().includes(appSearch.toLowerCase())
                  ).map((app) => (
                    <div key={app.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                            {app.profile_image ? (
                              <img src={`http://localhost:5000/${app.profile_image.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              app.name ? app.name.charAt(0).toUpperCase() : 'U'
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{app.user_name || 'Unknown User'}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{app.user_email || 'No email'}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                Applied for: {app.job_role || 'Unknown Job'}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                app.status === 'accepted' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                app.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              }`}>
                                Status: {app.status || 'pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ATS Score</p>
                            <span className={`text-2xl font-bold ${
                              app.ats_score >= 75 ? "text-emerald-600 dark:text-emerald-400" : 
                              app.ats_score >= 50 ? "text-amber-600 dark:text-amber-400" : 
                              "text-rose-600 dark:text-rose-400"
                            }`}>{app.ats_score || "0"}%</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApplicationAction(app.id, "accept")} 
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors text-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApplicationAction(app.id, "reject")} 
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-xl transition-colors text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "reports" && (
            <div className="space-y-8 animate-fadeInUp">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Assessment Analytics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase">Avg. Assessment Score</p>
                    <p className="text-3xl font-black text-indigo-900 dark:text-white mt-1">{stats.avgScore || 0}%</p>
                  </div>
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase">Total Completions</p>
                    <p className="text-3xl font-black text-emerald-900 dark:text-white mt-1">{testSubmissions.filter(s => s.status === 'submitted').length}</p>
                  </div>
                  <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase">Active Tests</p>
                    <p className="text-3xl font-black text-purple-900 dark:text-white mt-1">{jobs.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-bold mb-6">Recent Test Submissions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-800">
                        <th className="pb-4">Candidate</th>
                        <th className="pb-4">Job Role</th>
                        <th className="pb-4">Round</th>
                        <th className="pb-4">Score</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {testSubmissions.slice(0, 10).map(sub => (
                        <tr key={sub._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-xs uppercase">
                                {sub.user_id?.name?.charAt(0)}
                              </div>
                              <span className="font-bold">{sub.user_id?.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-gray-500">{sub.test_id?.title}</td>
                          <td className="py-4 text-gray-500">Round {sub.test_id?.round_number}</td>
                          <td className="py-4">
                            {sub.status === 'submitted' ? (
                              <span className="font-black text-blue-600">{((sub.total_score / sub.max_score) * 100).toFixed(1)}%</span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </td>
                          <td className="py-4">
                            {sub.status === 'submitted' ? (
                              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30">Completed</span>
                            ) : sub.status === 'cancelled' ? (
                              <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/30">Terminated</span>
                            ) : (
                              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">InProgress</span>
                            )}
                          </td>
                          <td className="py-4">
                            {sub.status === 'submitted' ? (
                              <div className="flex gap-2">
                                {applications.find(a => a.id === sub.application_id)?.status === 'rejected' ? (
                                  <span className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg border border-rose-100 uppercase tracking-widest">Candidate Rejected</span>
                                ) : (parseInt(applications.find(a => a.id === sub.application_id)?.current_round || 0) > sub.test_id?.round_number) ? (
                                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-100 uppercase tracking-widest">Promoted to R{applications.find(a => a.id === sub.application_id)?.current_round}</span>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handlePromote(sub.application_id)}
                                      disabled={processing}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-xl transition-all shadow-md shadow-blue-900/20 active:scale-95 disabled:opacity-50"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                      PROMOTE
                                    </button>
                                    <button 
                                      onClick={() => handleRejectAssessment(sub.application_id)}
                                      disabled={processing}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 text-rose-600 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[10px] font-black rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                      REJECT
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <button 
                                onClick={() => { setSelectedApplicant(applications.find(a => a.id === sub.application_id)); setActiveTab("applications"); }}
                                className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1"
                              >
                                View Details
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {testSubmissions.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-20 text-center text-gray-400 italic">No submissions yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Interviews Tab */}
        {activeTab === "interviews" && (
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Scheduled Interviews</h3>
                <div className="flex gap-3">
                   <button 
                     onClick={() => {
                       setMeetingData({
                         candidate_id: "",
                         job_id: "",
                         title: "",
                         description: "",
                         scheduled_at: "",
                         duration: 30,
                         type: "both",
                         is_instant: false
                       });
                       setShowMeetingModal(true);
                     }}
                     className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all uppercase tracking-widest flex items-center gap-2"
                   >
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                     Schedule New Interview
                   </button>
                   <span className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100">● {meetings.filter(m => m.status === 'scheduled').length} UPCOMING</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meetings.length === 0 ? (
                  <div className="col-span-full py-20 text-center opacity-40">
                    <p className="text-lg font-bold">No interviews scheduled yet.</p>
                  </div>
                ) : (
                  meetings.map(m => (
                    <div key={m._id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all">
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">
                               {m.candidate_id?.name ? m.candidate_id.name[0] : "?"}
                             </div>
                             <div>
                                <p className="text-sm font-black">{m.candidate_id?.name || "Unknown Candidate"}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{m.job_id?.title || "General Interview"}</p>
                             </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${m.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{m.status}</span>
                       </div>
                       
                       <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                             {new Date(m.scheduled_at).toLocaleDateString()} at {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.duration} mins)
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                             {m.type === 'both' ? 'Audio + Video' : m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                          </div>
                       </div>

                       <div className="flex gap-2">
                           <button 
                             onClick={() => navigate(`/meeting/${m.meeting_link}`)}
                             className="flex-1 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest"
                           >
                             Join Room
                           </button>
                           <button 
                             type="button"
                             onClick={() => handleDeleteMeeting(m._id)}
                             className="py-2 px-4 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 text-[10px] font-black rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950 transition-all uppercase tracking-widest border border-rose-100 dark:border-rose-900/30"
                           >
                             Cancel
                           </button>
                        </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {/* Meeting Modal */}
        {showMeetingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
             <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-2xl animate-fadeInUp">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-xl font-black text-gray-900 dark:text-white">Setup Interview</h3>
                   <button onClick={() => setShowMeetingModal(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <form onSubmit={handleCreateMeeting} className="space-y-5">
                   <div className="grid grid-cols-2 gap-4">
                      {!meetingData.candidate_id && (
                        <div className="col-span-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Select Candidate & Job</label>
                          <select 
                            required
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            onChange={(e) => {
                              const [candId, jobId, role] = e.target.value.split('|');
                              setMeetingData({...meetingData, candidate_id: candId, job_id: jobId, title: `Interview for ${role}`});
                            }}
                          >
                            <option value="">-- Choose an applicant --</option>
                            {applications.filter(a => a.status === 'accepted').map(app => (
                              <option key={app.id} value={`${app.user_id}|${app.job_id}|${app.job_role}`}>
                                {app.user_name} - {app.job_role} (R{app.current_round})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="col-span-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Interview Title</label>
                         <input 
                           type="text" 
                           required
                           className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="e.g. Technical Round 1"
                           value={meetingData.title}
                           onChange={(e) => setMeetingData({...meetingData, title: e.target.value})}
                         />
                      </div>
                      <div className="col-span-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Description</label>
                         <textarea 
                           className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                           placeholder="Meeting agenda..."
                           value={meetingData.description}
                           onChange={(e) => setMeetingData({...meetingData, description: e.target.value})}
                         />
                      </div>
                      
                      <div className="col-span-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Call Type</label>
                         <select 
                           className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={meetingData.type}
                           onChange={(e) => setMeetingData({...meetingData, type: e.target.value})}
                         >
                            <option value="both">Audio + Video</option>
                            <option value="video">Video Only</option>
                            <option value="audio">Audio Only</option>
                         </select>
                      </div>

                      <div className="col-span-2 flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                         <input 
                           type="checkbox" 
                           id="is_instant"
                           checked={meetingData.is_instant}
                           onChange={(e) => setMeetingData({...meetingData, is_instant: e.target.checked})}
                           className="w-5 h-5 rounded-lg accent-blue-600"
                         />
                         <label htmlFor="is_instant" className="text-xs font-bold text-blue-700 dark:text-blue-300">Create Instant Meeting (Call Now)</label>
                      </div>

                      {!meetingData.is_instant && (
                        <>
                          <div className="col-span-2 md:col-span-1">
                             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Start Time</label>
                             <input 
                               type="datetime-local" 
                               required={!meetingData.is_instant}
                               className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               value={meetingData.scheduled_at}
                               onChange={(e) => setMeetingData({...meetingData, scheduled_at: e.target.value})}
                             />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">End Time</label>
                             <input 
                               type="datetime-local" 
                               required={!meetingData.is_instant}
                               className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               value={meetingData.end_time}
                               onChange={(e) => setMeetingData({...meetingData, end_time: e.target.value})}
                             />
                          </div>
                        </>
                      )}
                   </div>

                   <button 
                     type="submit"
                     className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                   >
                     {meetingData.is_instant ? "Launch Meeting Now" : "Schedule Interview"}
                   </button>
                </form>
             </div>
          </div>
        )}

      </div>

      {/* Candidate Profile Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-950 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-slideInUp">
            <div className="relative p-8">
              <button 
                onClick={() => setSelectedApplicant(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-blue-500/20 overflow-hidden">
                  {selectedApplicant.profile_image ? (
                    <img src={`http://localhost:5000/${selectedApplicant.profile_image.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedApplicant.user_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-1">{selectedApplicant.user_name}</h3>
                  <p className="text-blue-600 dark:text-blue-400 font-bold mb-1">{selectedApplicant.user_email}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {selectedApplicant.location || "Remote / Global"}
                    </p>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs ${
                      selectedApplicant.ats_score >= 75 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600" :
                      selectedApplicant.ats_score >= 50 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600" :
                      "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      CRI Match: {selectedApplicant.ats_score || "0"}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                
                {/* About / Bio */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Professional Bio</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                    {selectedApplicant.bio || "No bio provided by the candidate."}
                  </p>
                </div>

                {/* Skills */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Categorized Skills</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hard Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(selectedApplicant.hard_skills) && selectedApplicant.hard_skills.length > 0 ? selectedApplicant.hard_skills.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black border border-blue-50 dark:border-blue-900/30">
                            {s.trim()}
                          </span>
                        )) : <p className="text-[10px] text-gray-400 italic">None listed</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Soft Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(selectedApplicant.soft_skills) && selectedApplicant.soft_skills.length > 0 ? selectedApplicant.soft_skills.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-50 dark:border-emerald-900/30">
                            {s.trim()}
                          </span>
                        )) : <p className="text-[10px] text-gray-400 italic">None listed</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Education */}
                {selectedApplicant.education?.length > 0 && (
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Education</h4>
                    <div className="space-y-4">
                      {selectedApplicant.education.filter(Boolean).map((edu, i) => (
                        <div key={i} className="bg-white dark:bg-gray-950 p-4 rounded-2xl border border-gray-50 dark:border-gray-800">
                          <p className="font-black text-gray-900 dark:text-white">{edu.degree || "Degree/Certificate"}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-bold">{edu.institution || "Institution"}</p>
                          <div className="flex justify-between mt-2 text-[10px] font-black uppercase text-gray-400">
                            <span>{edu.board || "Board/University"}</span>
                            <span>Score: {edu.marks || "--"} • {edu.year || "Year"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {selectedApplicant.experience?.length > 0 && (
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Work Experience</h4>
                    <div className="space-y-4">
                      {selectedApplicant.experience.filter(Boolean).map((exp, i) => (
                        <div key={i} className="bg-white dark:bg-gray-950 p-4 rounded-2xl border border-gray-50 dark:border-gray-800">
                          <div className="flex justify-between items-start">
                            <p className="font-black text-gray-900 dark:text-white">{exp.position || "Position"}</p>
                            <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">{exp.duration || "Duration"}</span>
                          </div>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">{exp.company || "Company"}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{exp.description || "Description"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {selectedApplicant.projects?.length > 0 && (
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Projects</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedApplicant.projects.filter(Boolean).map((proj, i) => (
                        <div key={i} className="bg-white dark:bg-gray-950 p-4 rounded-2xl border border-gray-50 dark:border-gray-800">
                          <p className="font-black text-gray-900 dark:text-white truncate">{proj.title || "Project Title"}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{proj.description || "Project Description"}</p>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {proj.technologies?.slice(0, 3).map((t, ti) => (
                              <span key={ti} className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-md">{t}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Professional Links</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.isArray(selectedApplicant.social_links) && selectedApplicant.social_links.length > 0 ? selectedApplicant.social_links.map((link, i) => (
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
                    )) : <p className="text-gray-400 italic text-sm">No links provided</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <span className="font-bold text-purple-900 dark:text-purple-300">{selectedApplicant.phone || "No phone provided"}</span>
                  </div>
                  {selectedApplicant.resume_path && (
                    <a 
                      href={`http://localhost:5000/${selectedApplicant.resume_path.replace(/\\/g, '/')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Open Resume
                    </a>
                  )}
                  {selectedApplicant.applied_with_profile && (
                    <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest">Applied via Profile</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
