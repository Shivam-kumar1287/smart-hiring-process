
import { useState, useEffect } from "react";
import api from "../utils/api";
import Navigation from "../components/Navigation";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSkills, setFilterSkills] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchJobs();
    loadSavedJobs();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const res = await api.get("/auth/profile");
      setUserRole(res.data.role);
      setUserId(res.data.id);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, filterSkills, filterCompany]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/jobs");
      setJobs(res.data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedJobs = () => {
    const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]");
    setSavedJobIds(saved);
  };

  const saveJob = (jobId) => {
    const updatedSavedIds = [...new Set([...savedJobIds, jobId])];
    localStorage.setItem("savedJobs", JSON.stringify(updatedSavedIds));
    setSavedJobIds(updatedSavedIds);
  };

  const unsaveJob = (jobId) => {
    const updatedSavedIds = savedJobIds.filter((id) => id !== jobId);
    localStorage.setItem("savedJobs", JSON.stringify(updatedSavedIds));
    setSavedJobIds(updatedSavedIds);
  };

  const isJobSaved = (jobId) => savedJobIds.includes(jobId);

  const filterJobs = () => {
    let filtered = jobs;

    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.job_role.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterSkills) {
      filtered = filtered.filter((job) =>
        job.required_skills.toLowerCase().includes(filterSkills.toLowerCase())
      );
    }

    if (filterCompany) {
      filtered = filtered.filter((job) =>
        job.company_name.toLowerCase().includes(filterCompany.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <Navigation />
      <div className="max-w-6xl mx-auto px-6 sm:px-12 lg:px-16 py-8 animate-fadeIn">

        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Job Opportunities
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Discover your dream role from our curated listings
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <input
              type="text"
              className="w-full px-3 py-3 border rounded-xl"
              placeholder="Search roles or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <input
              type="text"
              className="w-full px-3 py-3 border rounded-xl"
              placeholder="Filter by skills..."
              value={filterSkills}
              onChange={(e) => setFilterSkills(e.target.value)}
            />

            <input
              type="text"
              className="w-full px-3 py-3 border rounded-xl"
              placeholder="Filter by company..."
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            />

            <button
              onClick={() => {
                setSearchTerm("");
                setFilterSkills("");
                setFilterCompany("");
              }}
              className="px-4 py-3 bg-gray-200 rounded-xl"
            >
              Clear Filters
            </button>

          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            <span className="text-blue-600 font-bold text-lg">
              {filteredJobs.length}
            </span>{" "}
            jobs found
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No jobs matched</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Try adjusting your search criteria or clearing filters to see more results.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredJobs.map((job) => (
              <div 
                key={job.id} 
                className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-1 animate-fadeInUp"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  {/* Job Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {job.job_role}
                        </h3>
                        <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                          {job.company_name}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold uppercase tracking-wider rounded-full self-start">
                        New
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 transition-colors">
                        <svg className="w-4 h-4 mr-1.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        {job.required_skills}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {job.rounds} Rounds
                      </span>
                    </div>
                  </div>

                  {/* Actions & Meta */}
                  <div className="flex flex-col justify-between md:items-end space-y-4 md:space-y-0 md:min-w-[160px]">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    <div className="flex flex-col space-y-2 w-full pt-4">
                      {userRole === "user" && (
                        <>
                          <button
                            onClick={() => (window.location.href = `/apply/${job.id}`)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 flex justify-center items-center"
                          >
                            Apply Now
                          </button>
                          <button
                            onClick={() => isJobSaved(job.id) ? unsaveJob(job.id) : saveJob(job.id)}
                            className={`w-full px-4 py-2 border-2 font-medium rounded-xl transition-colors focus:outline-none flex justify-center items-center ${
                              isJobSaved(job.id) 
                                ? 'border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30' 
                                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <svg className={`w-4 h-4 mr-2 ${isJobSaved(job.id) ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {isJobSaved(job.id) ? 'Saved' : 'Save Job'}
                          </button>
                        </>
                      )}
                      {userRole === "hr" && job.created_by === userId && (
                         <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                           <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Your Posting</p>
                         </div>
                      )}
                    </div>
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

