import { useState, useEffect } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";

export default function SavedJobs() {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      const savedJobIds = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      const validIdRegex = /^[0-9a-fA-F]{24}$/;
      const filteredIds = savedJobIds.filter(id => typeof id === 'string' && validIdRegex.test(id));
      
      if (filteredIds.length !== savedJobIds.length) {
        localStorage.setItem('savedJobs', JSON.stringify(filteredIds));
      }

      if (filteredIds.length === 0) {
        setSavedJobs([]);
        setLoading(false);
        return;
      }

      const jobPromises = filteredIds.map(async (jobId) => {
        try {
          const res = await api.get(`/jobs/${jobId}`);
          return { ...res.data, saved: true };
        } catch (error) {
          return null;
        }
      });

      const jobs = await Promise.all(jobPromises);
      setSavedJobs(jobs.filter(job => job !== null));
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const unsaveJob = (jobId) => {
    try {
      const savedJobIds = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      const updatedIds = savedJobIds.filter(id => id !== jobId);
      localStorage.setItem('savedJobs', JSON.stringify(updatedIds));
      
      setSavedJobs(savedJobs.filter(job => job.id !== jobId));
    } catch (error) {
      alert("Error removing job from saved jobs");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-6 sm:px-12 lg:px-16 py-8 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Saved Jobs
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Jobs you've bookmarked for later</p>
          </div>
          <button onClick={() => navigate("/jobs")} className="px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-xl shadow-sm transition-colors">
            Browse More Jobs
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Saved Jobs Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">Keep track of interesting roles by saving them while you browse.</p>
            <button onClick={() => navigate("/jobs")} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all">
              Discover Opportunities
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {savedJobs.map((job) => (
              <div key={job.id} className="group bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-800 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">{job.job_role}</h3>
                    <p className="text-blue-600 dark:text-blue-400 font-medium mb-3">{job.company_name}</p>
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{job.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                       <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                         <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                         {job.required_skills}
                       </span>
                       <span className="inline-flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                         <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         {job.rounds} Rounds
                       </span>
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col justify-end gap-3 md:min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800">
                    <button onClick={() => navigate(`/apply/${job.id}`)} className="flex-1 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-center">
                      Apply Now
                    </button>
                    <button onClick={() => unsaveJob(job.id)} className="flex-1 w-full px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-semibold rounded-xl transition-colors text-center">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
