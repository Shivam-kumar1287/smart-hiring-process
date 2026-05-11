import { useState } from "react";
import api from "../utils/api";
import Navigation from "../components/Navigation";

export default function AIAnalyzer() {
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [inputType, setInputType] = useState("file");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setResume(e.target.files[0]);
    setError("");
  };

  const handleAnalyze = async () => {
    if ((inputType === "file" && !resume) || (inputType === "text" && !resumeText.trim())) {
      setError("Please provide a resume.");
      return;
    }
    if (!jd.trim()) {
      setError("Please provide a job description.");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setError("");

    const formData = new FormData();
    if (inputType === "file") {
      formData.append("resume", resume);
    } else {
      formData.append("resume_text", resumeText);
    }
    formData.append("jd", jd);

    try {
      const res = await api.post("/applications/analyze", formData);
      setAnalysis(res.data);
    } catch (err) {
      setError(err.response?.data || "Failed to analyze resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navigation />

      <main className="max-w-6xl mx-auto px-6 sm:px-12 lg:px-16 py-8 animate-fadeIn">
        <header className="text-center mb-12">
          <div className="inline-block px-4 py-1.5 mb-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-200 dark:border-blue-800">
            Advanced AI Evaluation
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">AI Resume <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Smart Analyzer</span></h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">Get a professional ATS score and deep skills gap analysis in seconds by comparing your resume with any job description.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-black">1</span>
                  Provide Resume
                </h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <button 
                    onClick={() => setInputType("file")}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${inputType === "file" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                  >
                    PDF
                  </button>
                  <button 
                    onClick={() => setInputType("text")}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${inputType === "text" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                  >
                    Text
                  </button>
                </div>
              </div>
              
              {inputType === "file" ? (
                <div className="w-full relative group">
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden" 
                    id="resume-upload" 
                  />
                  <label 
                    htmlFor="resume-upload"
                    className={`flex flex-col items-center justify-center w-full min-h-[180px] border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      resume 
                        ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10" 
                        : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-500 dark:hover:border-blue-400"
                    }`}
                  >
                    {resume ? (
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="font-bold text-gray-800 dark:text-gray-200">{resume.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Ready for analysis</p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <p className="font-bold text-gray-800 dark:text-gray-200">Drop PDF here</p>
                        <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <textarea
                  placeholder="Paste your resume text here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="w-full min-h-[180px] px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-gray-400 text-sm leading-relaxed"
                ></textarea>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold mb-4 w-full flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-black">2</span>
                Job Description
              </h2>
              <textarea
                placeholder="Paste the target job description here..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                className="w-full h-48 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-gray-400 text-sm leading-relaxed"
              ></textarea>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                loading 
                  ? "bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transform hover:-translate-y-1 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : "Start Analysis"}
            </button>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-medium animate-shake">
                {error}
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="lg:col-span-3 min-h-[500px]">
            {!analysis && !loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-800/20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem] text-center">
                <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-3xl shadow-sm flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-2xl font-black text-gray-300">Ready to Analyze</h3>
                <p className="text-gray-400 max-w-xs mt-2 font-medium">Upload your details and let the AI do the magic.</p>
              </div>
            ) : loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
                <div className="w-48 h-48 rounded-full border-[10px] border-gray-100 dark:border-gray-800 flex items-center justify-center">
                  <span className="text-4xl font-black text-gray-200">Evaluating</span>
                </div>
                <div className="w-64 h-4 bg-gray-100 dark:bg-gray-800 rounded-full mt-12"></div>
                <div className="w-48 h-4 bg-gray-100 dark:bg-gray-800 rounded-full mt-4"></div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-800 animate-fadeInUp">
                <div className="flex flex-col sm:flex-row items-center gap-8 mb-10">
                  <div className={`relative w-40 h-40 flex items-center justify-center rounded-full border-[12px] p-2 ${
                    analysis.score >= 75 ? "border-emerald-500/20 text-emerald-500" :
                    analysis.score >= 50 ? "border-amber-500/20 text-amber-500" :
                    "border-rose-500/20 text-rose-500"
                  }`}>
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle 
                        cx="80" cy="80" r="74" 
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeWidth="12"
                        strokeDasharray={465}
                        strokeDashoffset={465 - (465 * analysis.score) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-5xl font-black tracking-tighter">{analysis.score}%</span>
                      <span className="text-xs font-bold uppercase tracking-widest mt-1 opacity-50 text-gray-400">Match Score</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-2xl font-black mb-2">Overall Analysis</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed italic">"{analysis.summary}"</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-900/30">
                    <h4 className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      Hard Skills Match
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.hard_skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold shadow-sm border border-blue-100/20">{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-3xl border border-purple-100/50 dark:border-purple-900/30">
                    <h4 className="text-sm font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                       Soft Skills Noticed
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.soft_skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold shadow-sm border border-purple-100/20">{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl border border-rose-100/50 dark:border-rose-900/30">
                    <h4 className="text-sm font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                       Critical Gaps
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missing_skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200/30">{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/30">
                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4">Improvement Path</h4>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((sug, i) => (
                        <li key={i} className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">●</span>
                          {sug}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                  <button 
                    onClick={() => { setAnalysis(null); setResume(null); setResumeText(""); setJd(""); }}
                    className="text-sm font-bold text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Start New Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
