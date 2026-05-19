import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { getAssetUrl } from "../utils/api";
import Navigation from "../components/Navigation";

export default function Apply() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [applyMethod, setApplyMethod] = useState("profile"); // 'profile' or 'resume'
  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);

  useEffect(() => {
    // Check if user is a regular user and get profile
    api.get("/auth/profile").then(res => {
      if (res.data.role !== "user") {
        navigate("/hr-dashboard");
      }
      setUser(res.data);
    }).catch(() => navigate("/"));

    // Check if user already applied to this specific job
    api.get("/applications/my").then(res => {
      const alreadyApplied = res.data.some(app => app.job_id && app.job_id._id && app.job_id._id.toString() === id.toString());
      if (alreadyApplied) {
        alert("You have already applied for this job.");
        navigate("/user-dashboard");
      }
    }).catch(err => console.error("Error checking application status:", err));

    // Check if job is still open
    api.get(`/jobs/${id}`).then(res => {
      if(res.data.status === 'closed') {
        alert("This job is no longer accepting applications.");
        navigate("/jobs");
      }
      setJob(res.data);
    }).catch(err => {
      console.error("Error fetching job details:", err);
      alert("Job not found.");
      navigate("/jobs");
    });
  }, [id, navigate]);

  const handleDrag = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const applyJob = async () => {
    if (applyMethod === 'resume' && !file) {
      alert("Please upload your resume.");
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      if (applyMethod === 'resume') {
        formData.append("resume", file);
      } else {
        formData.append("use_profile", "true");
      }
      
      formData.append("job_id", id);
      if (coverLetter) {
        formData.append("cover_letter", coverLetter);
      }

      await api.post("/applications", formData, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
          "Content-Type": "multipart/form-data"
        }
      });

      alert("Applied Successfully!");
      navigate("/user-dashboard");
    } catch (err) {
      const message = err.response?.data || "Application failed. Please try again.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  if (!job || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex items-center justify-center p-4 py-12 animate-fadeInUp">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>
          
          <div className="mb-10 text-center">
             <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-inner">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v1z" /></svg>
             </div>
             <h2 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Apply for Position</h2>
             <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">{job.job_role} @ {job.company_name}</p>
          </div>

          <div className="space-y-8">
            
            {/* Method Selection */}
            <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
              <button 
                onClick={() => setApplyMethod("profile")}
                className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${applyMethod === 'profile' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Use Profile
              </button>
              <button 
                onClick={() => setApplyMethod("resume")}
                className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${applyMethod === 'resume' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Upload Resume
              </button>
            </div>

            {applyMethod === 'profile' ? (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100/50 dark:border-blue-900/30 animate-fadeIn">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-800">
                    {user.profile_image ? (
                      <img src={getAssetUrl(user.profile_image)} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-blue-600">{user.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white leading-tight">{user.name}</h4>
                    <p className="text-xs text-gray-500 font-bold">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    <span className="font-black text-blue-600 mr-2">✓</span> Your full profile including education, experience, and projects will be shared with the employer.
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    <span className="font-black text-blue-600 mr-2">✓</span> Our AI will analyze your profile against the job description for a CRI score.
                  </p>
                </div>
                <button 
                  onClick={() => navigate("/profile")}
                  className="mt-6 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-2"
                >
                  View/Edit Profile
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Resume Document (PDF/DOCX)</label>
                <div 
                  className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx" 
                    onChange={(e) => setFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-gray-900 dark:text-white font-black">{file.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center pointer-events-none">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <p className="text-gray-900 dark:text-white font-black">Drag & Drop Resume</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Supports PDF, DOCX up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cover Letter */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Personal Pitch (Optional)</label>
              <textarea 
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Briefly explain why you're a perfect match..."
                className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none h-32 resize-none font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6">
               <button 
                 onClick={applyJob}
                 disabled={loading || (applyMethod === 'resume' && !file)}
                 className={`flex-[2] py-4 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.2em] text-white shadow-xl transition-all flex justify-center items-center ${loading || (applyMethod === 'resume' && !file) ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400 shadow-none' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 shadow-blue-500/25'}`}
               >
                 {loading ? (
                   <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 ) : (
                   "Submit Application"
                 )}
               </button>
               <button 
                 onClick={() => navigate("/jobs")}
                 className="flex-1 py-4 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.2em] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
               >
                 Cancel
               </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}