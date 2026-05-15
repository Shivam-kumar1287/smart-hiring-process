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
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
