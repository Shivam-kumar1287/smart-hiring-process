import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Navigation from "../components/Navigation";

export default function Apply() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    // Check if user is a regular user
    api.get("/auth/profile").then(res => {
      if (res.data.role !== "user") {
        navigate("/hr-dashboard");
      }
    }).catch(() => navigate("/"));

    // Check if user already applied to this specific job
    api.get("/applications/my").then(res => {
      const alreadyApplied = res.data.some(app => app.job_id.toString() === id.toString());
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
    }).catch(err => {
      console.error("Error fetching job details:", err);
      alert("Job not found.");
      navigate("/jobs");
    });
  }, [id]);

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
    if (!file) {
      alert("Please upload your resume.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex items-center justify-center p-4 animate-fadeInUp">
        <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-800">
          
          <div className="mb-8 text-center">
             <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mx-auto flex items-center justify-center mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v1z" /></svg>
             </div>
             <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Submit Application</h2>
             <p className="text-gray-500 dark:text-gray-400 mt-2">Upload your resume to apply for this position.</p>
          </div>

          <div className="space-y-6">
            
            {/* File Dropzone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Resume (PDF, DOCX)</label>
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}`}
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
                    <svg className="w-12 h-12 text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-gray-900 dark:text-white font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center pointer-events-none">
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">Maximum file size 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Cover Letter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cover Letter (Optional)</label>
              <textarea 
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Why are you a great fit for this role?"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none h-32 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
               <button 
                 onClick={applyJob}
                 disabled={loading || !file}
                 className={`flex-1 py-3.5 rounded-xl font-medium text-white shadow-lg transition-all flex justify-center items-center ${loading || !file ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400 shadow-none' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95'}`}
               >
                 {loading ? (
                   <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 ) : (
                   "Submit Application"
                 )}
               </button>
               <button 
                 onClick={() => navigate("/jobs")}
                 className="px-6 py-3.5 rounded-xl font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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