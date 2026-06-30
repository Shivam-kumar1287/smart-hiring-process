import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Editor from "@monaco-editor/react";

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [activeLeftTab, setActiveLeftTab] = useState("description"); // "description" or "testcase"
  const [user, setUser] = useState(null);
  const [testResults, setTestResults] = useState(null); // { passed: 0, total: 0, cases: [] }
  const [runError, setRunError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const bypassTabSwitch = useRef(false);

  const [customInput, setCustomInput] = useState("");
  const [customResult, setCustomResult] = useState(null);
  const [isCustomRunning, setIsCustomRunning] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/profile");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user");
    }
  }, []);

  const fetchTest = useCallback(async () => {
    try {
      const res = await api.get(`/tests/start/${testId}`);
      setTest(res.data.test);
      setSubmissionId(res.data.submissionId);
      setTimeLeft(res.data.test.duration * 60);
      
      // Initialize code editor with boilerplate if empty
      const initialAnswers = {};
      res.data.test.questions.forEach(q => {
        if (q.type === 'code') {
          const drafts = {};
          const supportedLangs = ["javascript", "python", "java", "cpp"];
          supportedLangs.forEach(lang => {
            const bp = q.boilerplates?.find(b => b.language === lang);
            if (bp) {
              drafts[lang] = bp.code;
            } else {
              if (lang === "javascript") drafts[lang] = "// Write JavaScript here\nfunction solution(input) {\n  return input;\n}";
              else if (lang === "python") drafts[lang] = "# Write Python here\ndef solution(input):\n    return input";
              else if (lang === "java") drafts[lang] = "// Write Java here\nimport java.util.*;\n\npublic class main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}";
              else if (lang === "cpp") drafts[lang] = "// Write C++ here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}";
            }
          });

          initialAnswers[q._id] = {
            language: "javascript",
            code: drafts["javascript"],
            drafts: drafts
          };
        }
      });
      setAnswers(initialAnswers);
      
      setLoading(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to start test");
      navigate("/user-dashboard");
    }
  }, [testId, navigate]);

  useEffect(() => {
    fetchUser();
    fetchTest();
  }, [fetchUser, fetchTest]);

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
      if (document.hidden && !bypassTabSwitch.current) {
        handleTabSwitch();
      }
    };

    const handleBlur = () => {
      if (!bypassTabSwitch.current) {
        handleTabSwitch();
      }
    };

    const handleTabSwitch = async () => {
      if (!submissionId || loading || bypassTabSwitch.current) return;
      try {
        const res = await api.put(`/tests/tab-switch/${submissionId}`);
        if (res.data.terminated) {
          bypassTabSwitch.current = true;
          alert("Test terminated due to multiple tab switches!");
          navigate("/user-dashboard");
        } else {
          setTabSwitches(res.data.tab_switches);
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

  const navigateToQuestion = async (targetIdx) => {
    if (targetIdx === currentQuestionIdx) return;
    const q = test.questions[currentQuestionIdx];
    const answerData = answers[q._id] || {};
    
    setSubmitting(true);
    try {
      await api.post(`/tests/answer/${submissionId}`, {
        question_id: q._id,
        ...answerData
      });
      setCurrentQuestionIdx(targetIdx);
      setCustomInput("");
      setCustomResult(null);
      setIsCustomRunning(false);
    } catch (err) {
      bypassTabSwitch.current = true;
      alert("Failed to save answer");
      setTimeout(() => {
        bypassTabSwitch.current = false;
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrev = async () => {
    if (currentQuestionIdx > 0) {
      await navigateToQuestion(currentQuestionIdx - 1);
    }
  };

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
      bypassTabSwitch.current = true;
      alert("Failed to save answer");
      setTimeout(() => {
        bypassTabSwitch.current = false;
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    bypassTabSwitch.current = true;
    const confirmed = window.confirm("Are you sure you want to finish the test? You won't be able to change your answers.");
    if (!confirmed) {
      bypassTabSwitch.current = false;
      return;
    }
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
      bypassTabSwitch.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const runCode = async () => {
    const q = test.questions[currentQuestionIdx];
    const code = answers[q._id]?.code;
    const language = answers[q._id]?.language || "javascript";

    setIsRunning(true);
    setRunError(null);
    setTestResults(null);

    try {
      const publicCases = (q.test_cases || []).filter(tc => !tc.is_hidden);
      const res = await api.post("/tests/run", {
        code,
        language,
        test_cases: publicCases
      });

      setTestResults(res.data);
      
      const firstErrorCase = res.data.cases.find(c => c.error);
      if (firstErrorCase) {
        setRunError(firstErrorCase.error);
      }
    } catch (e) {
      setRunError(e.response?.data?.error || e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    const qId = currentQ._id;
    const currentAns = answers[qId] || {};
    const currentDrafts = { ...(currentAns.drafts || {}) };
    currentDrafts[currentAns.language] = currentAns.code;

    const newCode = currentDrafts[newLang] || "";
    setAnswers({
      ...answers,
      [qId]: {
        ...currentAns,
        language: newLang,
        code: newCode,
        drafts: currentDrafts
      }
    });
  };

  const runCustomCode = async () => {
    const q = test.questions[currentQuestionIdx];
    const code = answers[q._id]?.code;
    const language = answers[q._id]?.language || "javascript";

    setIsCustomRunning(true);
    setCustomResult(null);
    try {
      const res = await api.post("/tests/run-custom", {
        code,
        language,
        input: customInput
      });
      setCustomResult(res.data);
    } catch (e) {
      setCustomResult({
        error: e.response?.data?.error || e.message,
        status: "Error"
      });
    } finally {
      setIsCustomRunning(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Anti-cheat: Disable right-click, copy, paste
  const preventCheat = (e) => {
    e.preventDefault();
    bypassTabSwitch.current = true;
    alert("Security Policy: Copying and pasting is disabled during the assessment.");
    setTimeout(() => {
      bypassTabSwitch.current = false;
    }, 100);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white font-mono">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-xl tracking-widest">INITIALIZING ENVIRONMENT...</p>
    </div>
  );

  const currentQ = test.questions[currentQuestionIdx];
  const isCodeQ = currentQ.type === 'code';

  return (
    <div className="h-screen bg-[#1a1a1a] text-[#eff1f6] flex flex-col overflow-hidden font-sans">
      {/* Top Navbar */}
      <nav className="h-14 bg-[#282828] border-b border-[#3e3e3e] flex items-center justify-between px-4 shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </div>
          <div className="h-4 w-[1px] bg-[#3e3e3e]"></div>
          <h1 className="text-sm font-bold truncate max-w-[300px]">{test.title}</h1>
          <div className="flex gap-1.5 ml-4">
             {test.questions.map((_, i) => (
               <button
                 key={i}
                 onClick={() => navigateToQuestion(i)}
                 disabled={submitting}
                 title={`Go to Question ${i + 1}`}
                 className={`w-6 h-2 rounded-full transition-all cursor-pointer disabled:cursor-not-allowed outline-none border-none hover:scale-y-125 ${
                   i === currentQuestionIdx 
                     ? "bg-blue-500 shadow-md shadow-blue-500/50" 
                     : i < currentQuestionIdx 
                       ? "bg-emerald-500 hover:bg-emerald-400" 
                       : "bg-[#3e3e3e] hover:bg-[#555]"
                 }`}
               />
             ))}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 bg-[#333] px-4 py-1.5 rounded-full border border-[#444]">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className={`text-sm font-black tabular-nums ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Warnings:</span>
             <span className={`text-sm font-black ${tabSwitches > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{tabSwitches}/2</span>
          </div>

          <button 
            onClick={handleFinalSubmit}
            className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20"
          >
            Submit Test
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className={`flex-1 flex overflow-hidden ${isCodeQ ? 'flex-row' : 'flex-col p-8'}`}>
        
        {isCodeQ ? (
          <>
            {/* Left Side: Question & Testcases */}
            <div className="w-[40%] flex flex-col border-r border-[#3e3e3e] bg-[#282828] relative overflow-hidden">
              <div className="flex items-center gap-4 px-4 h-10 border-b border-[#3e3e3e] bg-[#222]">
                <button 
                  onClick={() => setActiveLeftTab("description")}
                  className={`text-xs font-bold flex items-center gap-2 transition-all h-full border-b-2 ${activeLeftTab === "description" ? "text-blue-400 border-blue-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Description
                </button>
                <button 
                  onClick={() => setActiveLeftTab("testcase")}
                  className={`text-xs font-bold flex items-center gap-2 transition-all h-full border-b-2 ${activeLeftTab === "testcase" ? "text-blue-400 border-blue-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  Testcase
                </button>
                <button 
                  onClick={() => setActiveLeftTab("custom")}
                  className={`text-xs font-bold flex items-center gap-2 transition-all h-full border-b-2 ${activeLeftTab === "custom" ? "text-blue-400 border-blue-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Custom Run
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeLeftTab === "description" ? (
                  <div className="animate-fadeIn">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl font-bold">Q{currentQuestionIdx + 1}.</span>
                      <span className="text-xl font-bold">{currentQ.question}</span>
                    </div>
                    
                    <div className="flex gap-2 mb-6">
                      <span className="px-2 py-0.5 bg-[#3e3e3e] text-[10px] text-emerald-400 font-bold rounded uppercase tracking-wider">Medium</span>
                      <span className="px-2 py-0.5 bg-[#3e3e3e] text-[10px] text-gray-400 font-bold rounded uppercase tracking-wider">Algorithm</span>
                    </div>

                    <div className="prose prose-invert max-w-none text-[#eff1f6] text-[15px] leading-relaxed">
                       <p>Implement a function that solves the given problem statement efficiently. Consider edge cases and time complexity.</p>
                       <div className="bg-[#333] p-4 rounded-xl border border-[#444] mt-4">
                         <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Example 1:</h4>
                         <code className="text-emerald-400">Input: {currentQ.test_cases?.find(tc => !tc.is_hidden)?.input || "[1, 2, 3]"}</code><br/>
                         <code className="text-blue-400">Output: {currentQ.test_cases?.find(tc => !tc.is_hidden)?.output || "6"}</code>
                       </div>
                    </div>
                  </div>
                ) : activeLeftTab === "testcase" ? (
                  <div className="animate-fadeIn space-y-4">
                    {(currentQ.test_cases || []).filter(tc => !tc.is_hidden).map((tc, idx) => (
                      <div key={idx} className="bg-[#333] rounded-xl border border-[#444] overflow-hidden">
                        <div className="bg-[#222] px-4 py-2 text-[10px] font-black uppercase text-gray-500 flex justify-between">
                          <span>Case {idx + 1}</span>
                          <span className="text-emerald-500">Public</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Input</p>
                            <div className="bg-[#1a1a1a] p-2 rounded text-sm font-mono text-gray-300">{tc.input}</div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Expected Output</p>
                            <div className="bg-[#1a1a1a] p-2 rounded text-sm font-mono text-emerald-400">{tc.output}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(currentQ.test_cases || []).filter(tc => tc.is_hidden).length > 0 && (
                      <div className="p-4 bg-indigo-900/20 border border-indigo-900/40 rounded-xl">
                        <p className="text-xs text-indigo-400 font-bold flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          {(currentQ.test_cases || []).filter(tc => tc.is_hidden).length} Hidden test cases will be used for final evaluation.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-fadeIn space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Run Code Interactively</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Custom Input (stdin)</label>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Provide standard input (stdin) for your program here..."
                        className="w-full h-32 bg-[#1a1a1a] border border-[#3e3e3e] rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-xs text-gray-300"
                      />
                    </div>
                    <button
                      onClick={runCustomCode}
                      disabled={isCustomRunning}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-all shadow-md shadow-blue-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none outline-none"
                    >
                      {isCustomRunning ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Executing Code...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Run Custom Input
                        </>
                      )}
                    </button>
                    {customResult && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Execution Result</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            customResult.status === "Accepted" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/20" :
                            customResult.status === "Compilation Error" ? "bg-slate-900/60 text-slate-400 border border-slate-700" :
                            "bg-rose-950/60 text-rose-400 border border-rose-500/20"
                          }`}>
                            {customResult.status || "Completed"}
                          </span>
                        </div>
                        {customResult.error ? (
                          <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-rose-400 tracking-wider mb-1">Error Details</p>
                            <pre className="text-xs font-mono text-rose-300 whitespace-pre-wrap">{customResult.error}</pre>
                          </div>
                        ) : (
                          <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Standard Output (stdout)</p>
                            <pre className="text-xs font-mono text-emerald-400 whitespace-pre max-h-48 overflow-y-auto">{customResult.stdout || "(No stdout)"}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Code Editor */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e]">
               <div className="flex items-center justify-between px-4 h-10 border-b border-[#3e3e3e] bg-[#222]">
                  <div className="flex items-center gap-4 h-full">
                    <div className="text-xs font-bold text-blue-400 flex items-center gap-2 border-b-2 border-blue-400 h-full">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                      Code Editor
                    </div>
                    <select 
                      className="bg-transparent border-none text-[11px] font-bold text-gray-400 outline-none cursor-pointer hover:text-white transition-colors"
                      value={answers[currentQ._id]?.language || "javascript"}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python 3</option>
                      <option value="java">Java 17</option>
                      <option value="cpp">C++ 20</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="p-1.5 hover:bg-[#333] rounded-lg text-gray-500 transition-all" title="Reset Code">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button className="p-1.5 hover:bg-[#333] rounded-lg text-gray-500 transition-all" title="Settings">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                  </div>
               </div>

               <div 
                 className="flex-1 relative group overflow-hidden"
                 onCopy={preventCheat}
                 onPaste={preventCheat}
                 onCut={preventCheat}
                 onContextMenu={(e) => e.preventDefault()}
               >
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={answers[currentQ._id]?.language || "javascript"}
                    value={answers[currentQ._id]?.code || ""}
                    onChange={(val) => setAnswers({...answers, [currentQ._id]: { ...answers[currentQ._id], code: val }})}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      contextmenu: false,
                    }}
                  />
                  
                  {/* Error Overlay */}
                  {runError && (
                    <div className="absolute bottom-4 right-4 max-w-[80%] bg-rose-900/90 border border-rose-500 p-4 rounded-xl backdrop-blur-md animate-fadeIn">
                       <p className="text-xs font-black uppercase text-rose-300 mb-1 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         Syntax Error Detected
                       </p>
                       <p className="text-sm font-mono text-white">{runError}</p>
                    </div>
                  )}

                  {/* Test Results Overlay */}
                  {testResults && (
                    <div className="absolute bottom-4 left-16 right-4 max-h-[40%] bg-[#222]/95 border border-[#444] rounded-xl backdrop-blur-md p-4 overflow-y-auto animate-fadeInUp">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Test Execution Summary</h4>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${testResults.passed === testResults.total ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {testResults.passed}/{testResults.total} CASES PASSED
                          </span>
                       </div>
                       <div className="grid gap-2">
                          {testResults.cases.map((tc, i) => {
                             let badgeClass = "bg-red-950/60 text-red-400 border border-red-500/20";
                             if (tc.status === "Accepted") badgeClass = "bg-emerald-950/60 text-emerald-400 border border-emerald-500/20";
                             else if (tc.status === "Time Limit Exceeded") badgeClass = "bg-amber-950/60 text-amber-400 border border-amber-500/20";
                             else if (tc.status === "Runtime Error") badgeClass = "bg-rose-950/60 text-rose-400 border border-rose-500/20";
                             else if (tc.status === "Compilation Error") badgeClass = "bg-slate-900/60 text-slate-400 border border-slate-700";

                             return (
                               <div key={i} className={`p-3 rounded-lg border flex justify-between items-center ${tc.passed ? "bg-emerald-950/20 border-emerald-900/30" : "bg-rose-900/10 border-rose-900/30"}`}>
                                 <div className="text-xs font-mono flex flex-wrap items-center gap-2">
                                   <span className="text-gray-400 font-bold mr-1">Case {i+1}:</span>
                                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                     {tc.status || (tc.passed ? "Accepted" : "Wrong Answer")}
                                   </span>
                                   {tc.status === "Compilation Error" || tc.status === "Runtime Error" || tc.error ? (
                                     <span className="text-rose-400 break-all font-bold">Error: {tc.error || "Execution failed"}</span>
                                   ) : (
                                     <>
                                       <span className="text-blue-400">In: {tc.input}</span>
                                       <span className="text-gray-600">|</span>
                                       <span className="text-emerald-400">Exp: {tc.expected}</span>
                                       <span className="text-gray-600">|</span>
                                       <span className={tc.passed ? "text-emerald-400" : "text-rose-400"}>Got: {tc.actual}</span>
                                     </>
                                   )}
                                 </div>
                                 {tc.passed ? (
                                   <svg className="w-4 h-4 text-emerald-500 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                 ) : (
                                   <svg className="w-4 h-4 text-rose-500 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                 )}
                               </div>
                             );
                          })}
                       </div>
                    </div>
                  )}
               </div>

               <div className="h-10 bg-[#282828] border-t border-[#3e3e3e] flex items-center justify-between px-4 shrink-0">
                  <div className="flex gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    {isRunning ? (
                      <span className="flex items-center gap-2 animate-pulse">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        Running code against test cases...
                      </span>
                    ) : (
                      <span>Environment Ready</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={runCode}
                      disabled={isRunning}
                      className="px-4 py-1 bg-[#333] hover:bg-[#444] text-[11px] font-bold rounded transition-all active:scale-95 disabled:opacity-50"
                    >
                      Run Code
                    </button>
                    {currentQuestionIdx > 0 && (
                      <button 
                        onClick={handlePrev}
                        disabled={submitting}
                        className="px-4 py-1 bg-[#333] hover:bg-[#444] text-gray-300 text-[11px] font-bold rounded transition-all border border-[#444] active:scale-95 disabled:opacity-50"
                      >
                        Previous
                      </button>
                    )}
                    <button 
                      onClick={handleNext}
                      disabled={submitting}
                      className="px-4 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-[11px] font-bold rounded transition-all border border-emerald-600/30 active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : currentQuestionIdx === test.questions.length - 1 ? "Submit" : "Next"}
                    </button>
                  </div>
               </div>
            </div>
          </>
        ) : (
          /* MCQ / Theory View */
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-10 py-12">
            <div className="bg-[#282828] border border-[#3e3e3e] p-10 rounded-3xl shadow-xl">
              <h2 className="text-3xl font-bold mb-10 leading-relaxed text-blue-400">
                <span className="text-gray-500 mr-4">Q{currentQuestionIdx + 1}.</span>
                {currentQ.question}
              </h2>

              <div className="space-y-6">
                {currentQ.type === 'mcq' && (
                  <div className="grid grid-cols-1 gap-4">
                    {currentQ.options.map((opt, i) => (
                      <button 
                        key={i}
                        onClick={() => setAnswers({...answers, [currentQ._id]: { answer: opt }})}
                        className={`group p-6 rounded-2xl border-2 text-left transition-all font-bold flex items-center gap-4 ${
                          answers[currentQ._id]?.answer === opt 
                            ? "bg-blue-600/10 border-blue-500 text-blue-400" 
                            : "bg-[#222] border-[#333] text-gray-400 hover:border-[#444] hover:text-gray-200"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                          answers[currentQ._id]?.answer === opt ? "bg-blue-500 border-blue-400 text-white" : "border-[#444] group-hover:border-gray-500"
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {currentQ.type === 'theory' && (
                  <textarea 
                    className="w-full h-80 bg-[#222] border border-[#333] rounded-2xl p-8 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium leading-relaxed text-gray-200"
                    placeholder="Type your comprehensive explanation here..."
                    value={answers[currentQ._id]?.answer || ""}
                    onChange={(e) => setAnswers({...answers, [currentQ._id]: { answer: e.target.value }})}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-gray-600 text-xs italic font-medium">Auto-saving your progress...</p>
              <div className="flex gap-4">
                {currentQuestionIdx > 0 && (
                  <button 
                    onClick={handlePrev}
                    disabled={submitting}
                    className="px-8 py-4 bg-[#333] hover:bg-[#444] text-white rounded-2xl font-black text-xl shadow-2xl border border-[#444] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    Previous Question
                  </button>
                )}
                <button 
                  onClick={handleNext}
                  disabled={submitting}
                  className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? "Processing..." : currentQuestionIdx === test.questions.length - 1 ? "Finish Assessment" : "Next Question"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
