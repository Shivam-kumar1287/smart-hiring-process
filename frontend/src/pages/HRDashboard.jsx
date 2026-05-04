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

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get("/jobs/my");
      setJobs(res.data);
      calculateStats(res.data, applications);
    } catch (err) {}
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get("/applications");
      setApplications(res.data);
      calculateStats(jobs, res.data);
    } catch (err) {}
  };

  const calculateStats = (jobsData, applicationsData) => {
    const s = {
      totalJobs: jobsData.length,
      totalApplications: applicationsData.length,
      pendingApplications: applicationsData.filter(app => app.status === 'pending').length,
      acceptedApplications: applicationsData.filter(app => app.status === 'accepted').length,
      rejectedApplications: applicationsData.filter(app => app.status === 'rejected').length,
      activeJobs: jobsData.length
    };
    setStats(s);
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
          {["overview", "jobs", "applications", "members"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {tab === "jobs" ? `Manage Jobs (${jobs.length})` : tab === "applications" ? `Applicants (${applications.length})` : tab === "members" ? `Members (${applications.length})` : tab}
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
                          <button onClick={() => handleToggleStatus(job.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${job.status === 'closed' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40'}`}>
                            {job.status === 'closed' ? 'Reopen Job' : 'Close Job'}
                          </button>
                          <button onClick={() => handleEdit(job)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Edit</button>
                          <button onClick={() => handleDelete(job.id)} className="px-4 py-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">Delete</button>
                        </div>
                      </div>
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
                                  {(app.social_links || []).map((link, i) => (
                                    <a 
                                      key={i} 
                                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
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

                            {app.resume_path && (
                              <div className="mt-3 flex items-center gap-4">
                                <a href={`http://localhost:5000/${app.resume_path.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                  View Resume
                                </a>
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
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{app.name || 'Unknown User'}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{app.email || 'No email'}</p>
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

        </div>
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
                  <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {selectedApplicant.location || "Remote / Global"}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Professional Bio</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                    {selectedApplicant.bio || "No bio provided by the candidate."}
                  </p>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Core Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicant.skills ? selectedApplicant.skills.split(',').map((s, i) => (
                      <span key={i} className="px-3.5 py-1.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                        {s.trim()}
                      </span>
                    )) : <p className="text-gray-400 italic text-sm">No skills listed</p>}
                  </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Professional Links</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(selectedApplicant.social_links || []).length > 0 ? selectedApplicant.social_links.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md transition-all group"
                      >
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {link.platform?.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{link.platform}</p>
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{link.url.replace(/^https?:\/\//i, '')}</p>
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
                  <a 
                    href={selectedApplicant.resume_path ? `http://localhost:5000/${selectedApplicant.resume_path.replace(/\\/g, '/')}` : "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    Open Resume
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
}
