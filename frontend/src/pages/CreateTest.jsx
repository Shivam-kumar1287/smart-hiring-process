import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Navigation from "../components/Navigation";

export default function CreateTest() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState({
    title: "",
    description: "",
    duration: 60,
    round_number: 1,
    start_time: "",
    end_time: "",
    show_marks: false,
    questions: []
  });


  const addQuestion = (type) => {
    const newQuestion = {
      type,
      question: "",
      points: 1,
      options: type === "mcq" ? ["", "", "", ""] : [],
      correct_answer: "",
      test_cases: type === "code" ? [{ input: "", output: "" }] : []
    };
    setTestData({ ...testData, questions: [...testData.questions, newQuestion] });
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...testData.questions];
    updatedQuestions[index][field] = value;
    setTestData({ ...testData, questions: updatedQuestions });
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.post("/tests", { ...testData, job_id: jobId });
      alert("Test created successfully!");
      navigate("/hr-dashboard");
    } catch (err) {
      alert("Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto p-6 pt-24">
        <h1 className="text-3xl font-bold mb-8">Create New Assessment</h1>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Test Title</label>
              <input 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Technical Round 1"
                onChange={(e) => setTestData({...testData, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Round Number</label>
              <input 
                type="number"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setTestData({...testData, round_number: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Description</label>
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24"
              onChange={(e) => setTestData({...testData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Duration (mins)</label>
              <input 
                type="number"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setTestData({...testData, duration: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Start Time</label>
              <input 
                type="datetime-local"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setTestData({...testData, start_time: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">End Time</label>
              <input 
                type="datetime-local"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setTestData({...testData, end_time: e.target.value})}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <input 
              type="checkbox" 
              id="show_marks"
              className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              checked={testData.show_marks}
              onChange={(e) => setTestData({...testData, show_marks: e.target.checked})}
            />
            <label htmlFor="show_marks" className="text-sm font-bold text-blue-900">
              Allow candidates to see their marks/results immediately after submission
            </label>
          </div>
        </div>


        <div className="space-y-6">
          <h2 className="text-xl font-bold">Questions ({testData.questions.length})</h2>
          
          {testData.questions.map((q, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between mb-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                  {q.type}
                </span>
                <button 
                  onClick={() => {
                    const newQs = testData.questions.filter((_, i) => i !== idx);
                    setTestData({...testData, questions: newQs});
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              <input 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                placeholder="Question Text"
                value={q.question}
                onChange={(e) => updateQuestion(idx, "question", e.target.value)}
              />

              {q.type === "mcq" && (
                <div className="grid grid-cols-2 gap-4">
                  {q.options.map((opt, optIdx) => (
                    <input 
                      key={optIdx}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={`Option ${optIdx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...q.options];
                        newOpts[optIdx] = e.target.value;
                        updateQuestion(idx, "options", newOpts);
                      }}
                    />
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500">Correct Answer</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={q.correct_answer}
                      onChange={(e) => updateQuestion(idx, "correct_answer", e.target.value)}
                    >
                      <option value="">Select Correct Option</option>
                      {q.options.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {q.type === "code" && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-bold mb-2">Test Cases</h4>
                    {q.test_cases.map((tc, tcIdx) => (
                      <div key={tcIdx} className="grid grid-cols-2 gap-2 mb-2">
                        <input 
                          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          placeholder="Input"
                          value={tc.input}
                          onChange={(e) => {
                            const newTcs = [...q.test_cases];
                            newTcs[tcIdx].input = e.target.value;
                            updateQuestion(idx, "test_cases", newTcs);
                          }}
                        />
                        <input 
                          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          placeholder="Expected Output"
                          value={tc.output}
                          onChange={(e) => {
                            const newTcs = [...q.test_cases];
                            newTcs[tcIdx].output = e.target.value;
                            updateQuestion(idx, "test_cases", newTcs);
                          }}
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newTcs = [...q.test_cases, { input: "", output: "" }];
                        updateQuestion(idx, "test_cases", newTcs);
                      }}
                      className="text-xs text-blue-500 font-bold"
                    >
                      + Add Test Case
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-4">
            <button onClick={() => addQuestion("mcq")} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold hover:bg-blue-100 transition-all">+ MCQ</button>
            <button onClick={() => addQuestion("theory")} className="flex-1 py-3 bg-purple-50 text-purple-600 rounded-2xl font-bold hover:bg-purple-100 transition-all">+ Theory</button>
            <button onClick={() => addQuestion("code")} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold hover:bg-emerald-100 transition-all">+ Coding</button>
          </div>

          <button 
            onClick={handleCreate}
            disabled={loading || testData.questions.length === 0}
            className="w-full py-4 bg-gray-900 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Creating..." : "Save Assessment & Notify Candidates"}
          </button>
        </div>
      </div>
    </div>
  );
}
