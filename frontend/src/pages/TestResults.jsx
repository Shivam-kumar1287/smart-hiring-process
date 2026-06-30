import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import Navigation from "../components/Navigation";

export default function TestResults() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/tests/results/${submissionId}`);
        setSubmission(res.data);
        setLoading(false);
      } catch (err) {
        alert("Failed to fetch results");
      }
    };
    fetchResults();
  }, [submissionId]);

  if (loading) return <div>Loading Results...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-5xl mx-auto p-6 pt-24">
        <header className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black mb-2">{submission.test_id.title}</h1>
            <p className="text-gray-500 font-medium">Candidate: <span className="text-gray-900 font-bold">{submission.user_id.name}</span></p>
          </div>
          <div className="text-right">
            <div className="inline-block px-6 py-4 bg-gray-900 rounded-3xl text-center">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-3xl font-black text-white">{submission.total_score} / {submission.max_score}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tab Switches</p>
            <p className={`text-4xl font-black ${submission.tab_switches > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {submission.tab_switches}
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Accuracy</p>
            <p className="text-4xl font-black text-blue-600">
              {Math.round((submission.total_score / submission.max_score) * 100)}%
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</p>
            <p className="text-4xl font-black capitalize text-gray-900">
              {submission.status}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black">Detailed Breakdown</h2>
          {submission.answers.map((ans, i) => {
            const question = submission.test_id.questions.find(q => q._id === ans.question_id);
            return (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 block">Question {i+1} • {question.type}</span>
                    <h3 className="text-lg font-bold leading-relaxed">{question.question}</h3>
                  </div>
                  <div className={`px-4 py-2 rounded-xl font-black text-sm ${ans.score > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    +{ans.score} Points
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Candidate Answer</h4>
                    {question.type === 'code' ? (
                      <pre className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                        {ans.code}
                      </pre>
                    ) : (
                      <p className="bg-gray-50 p-4 rounded-xl text-sm font-medium border border-gray-100">
                        {ans.answer || "No answer provided"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">AI Feedback</h4>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-900 font-medium leading-relaxed italic">
                      "{ans.feedback || "Correct MCQ selection."}"
                    </div>
                  </div>
                </div>

                {question.type === 'code' && ans.cases && ans.cases.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-100 space-y-4 animate-fadeIn">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                      <span>Test Case Results</span>
                      <span className="text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-full text-[10px] tracking-normal">
                        {ans.cases.filter(c => c.passed).length} / {ans.cases.length} Passed
                      </span>
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {ans.cases.map((tc, tcIdx) => {
                        let statusColor = "text-red-600 bg-red-50 border-red-100";
                        if (tc.status === "Accepted") statusColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
                        else if (tc.status === "Time Limit Exceeded") statusColor = "text-amber-600 bg-amber-50 border-amber-100";
                        else if (tc.status === "Runtime Error") statusColor = "text-pink-600 bg-pink-50 border-pink-100";
                        else if (tc.status === "Compilation Error") statusColor = "text-gray-600 bg-gray-50 border-gray-100";

                        return (
                          <div key={tcIdx} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                            tc.passed ? "bg-white border-gray-100 hover:border-emerald-200" : "bg-rose-50/10 border-rose-100 hover:border-rose-200"
                          }`}>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs font-black text-gray-400">Test {tcIdx + 1}</span>
                              
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                                {tc.status || (tc.passed ? "Accepted" : "Wrong Answer")}
                              </span>
                              
                              {tc.is_hidden && (
                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                  Hidden
                                </span>
                              )}
                              
                              {tc.status !== "Compilation Error" && tc.status !== "Runtime Error" && !tc.error && (
                                <div className="text-xs font-mono text-gray-500 flex flex-wrap items-center gap-2">
                                  <span>Input: <code className="bg-gray-100 px-1 rounded text-gray-800 font-mono">{tc.input}</code></span>
                                  <span className="text-gray-300">|</span>
                                  <span>Expected: <code className="bg-gray-100 px-1 rounded text-emerald-700 font-mono">{tc.expected}</code></span>
                                  <span className="text-gray-300">|</span>
                                  <span>Actual: <code className={`px-1 rounded font-mono ${tc.passed ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>{tc.actual}</code></span>
                                </div>
                              )}

                              {(tc.status === "Compilation Error" || tc.status === "Runtime Error" || tc.error) && (
                                <div className="text-xs font-mono text-rose-600 break-all font-bold">
                                  Error: {tc.error || "Failed to execute"}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center">
                              {tc.passed ? (
                                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                  Passed
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-xs font-black text-rose-600">
                                  <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                  Failed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
