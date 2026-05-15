import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [answers, setAnswers] = useState({});

  const fetchTest = useCallback(async () => {
    try {
      const res = await api.get(`/tests/start/${testId}`);
      setTest(res.data.test);
      setSubmissionId(res.data.submissionId);
      setTimeLeft(res.data.test.duration * 60);
      setLoading(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to start test");
      navigate("/user-dashboard");
    }
  }, [testId, navigate]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0 || loading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabSwitch();
      }
    };

    const handleBlur = () => {
      handleTabSwitch();
    };

    const handleTabSwitch = async () => {
      if (!submissionId || loading) return;
      try {
        const res = await api.put(`/tests/tab-switch/${submissionId}`);
        if (res.data.terminated) {
          alert("Test terminated due to multiple tab switches!");
          navigate("/user-dashboard");
        } else {
          setTabSwitches(res.data.tab_switches);
          alert(`Warning: Tab switch detected! Test will be cancelled if you switch again. (Strike 1/2)`);
        }
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [submissionId, loading, navigate]);

  const handleNext = async () => {
    const q = test.questions[currentQuestionIdx];
    const answerData = answers[q._id] || {};
    
    setSubmitting(true);
    try {
      await api.post(`/tests/answer/${submissionId}`, {
        question_id: q._id,
        ...answerData
      });

      if (currentQuestionIdx < test.questions.length - 1) {
        setCurrentQuestionIdx(currentQuestionIdx + 1);
      } else {
        await handleFinalSubmit();
      }
    } catch (err) {
      alert("Failed to save answer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/tests/finalize/${submissionId}`);
      if (test.show_marks) {
        alert(`Test submitted! Your total score: ${res.data.total_score}`);
      } else {
        alert("Test submitted successfully! Your results will be reviewed by HR.");
      }
      navigate("/user-dashboard");
    } catch (err) {

      alert("Final submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Assessment...</div>;

  const currentQ = test.questions[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-8 flex flex-col">
      <header className="flex justify-between items-center mb-8 bg-white/5 p-6 rounded-3xl backdrop-blur-xl border border-white/10">
        <div>
          <h1 className="text-xl font-black text-blue-400">{test.title}</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Question {currentQuestionIdx + 1} of {test.questions.length}</p>
        </div>
        <div className="flex gap-6 items-center">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Time Left</p>
            <p className={`text-2xl font-black tabular-nums ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Warnings</p>
            <p className="text-2xl font-black text-amber-500">{tabSwitches}/2</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] min-h-[400px] flex flex-col">
          <h2 className="text-2xl font-bold mb-8 leading-relaxed">
            {currentQ.question}
          </h2>

          <div className="flex-1">
            {currentQ.type === 'mcq' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => setAnswers({...answers, [currentQ._id]: { answer: opt }})}
                    className={`p-6 rounded-2xl border-2 text-left transition-all font-bold ${
                      answers[currentQ._id]?.answer === opt 
                        ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="mr-4 text-blue-400">0{i+1}.</span> {opt}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === 'theory' && (
              <textarea 
                className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-6 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium leading-relaxed"
                placeholder="Type your explanation here..."
                value={answers[currentQ._id]?.answer || ""}
                onChange={(e) => setAnswers({...answers, [currentQ._id]: { answer: e.target.value }})}
              />
            )}

            {currentQ.type === 'code' && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <select 
                    className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                    value={answers[currentQ._id]?.language || "javascript"}
                    onChange={(e) => setAnswers({...answers, [currentQ._id]: { ...answers[currentQ._id], language: e.target.value }})}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                  </select>
                </div>
                <textarea 
                  className="w-full h-96 bg-gray-900 border border-white/10 rounded-2xl p-6 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="// Write your code here..."
                  value={answers[currentQ._id]?.code || ""}
                  onChange={(e) => setAnswers({...answers, [currentQ._id]: { ...answers[currentQ._id], code: e.target.value }})}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pb-12">
          <p className="text-gray-500 text-sm italic">
            Warning: Moving to the next question will auto-submit the current one.
          </p>
          <button 
            onClick={handleNext}
            disabled={submitting}
            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Processing..." : currentQuestionIdx === test.questions.length - 1 ? "Finish & Submit" : "Next Question"}
          </button>
        </div>
      </main>
    </div>
  );
}
