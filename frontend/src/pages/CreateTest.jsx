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
    proctoring_settings: {
      camera_monitoring: false,
      microphone_monitoring: false,
      detect_multiple_persons: false,
      detect_mobile_phone: false,
      detect_electronic_devices: false,
      face_detection: false,
      look_away_detection: false,
      random_screenshot: false,
      screenshot_on_violation: false,
      tab_switch_detection: false,
      full_screen_required: false,
      copy_paste_disabled: false,
      right_click_disabled: false,
      max_warnings: 3,
      auto_terminate: false
    },
    questions: []
  });

  const [activeLangMap, setActiveLangMap] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  const handleAIGenerateBoilerplates = async (idx) => {
    const q = testData.questions[idx];
    if (!q.question) {
      alert("Please enter a question description first so the AI has context to generate boilerplates!");
      return;
    }

    const activeLang = activeLangMap[idx] || "javascript";
    const activeCodeObj = q.boilerplates?.find(b => b.language === activeLang);
    const existingBoilerplate = activeCodeObj ? activeCodeObj.code : "";

    setAiLoading(prev => ({ ...prev, [idx]: { ...prev[idx], boilerplates: true } }));
    try {
      const res = await api.post("/tests/generate-boilerplates", {
        question: q.question,
        existingBoilerplate,
        existingLanguage: activeLang
      });

      const updatedQuestions = [...testData.questions];
      const languages = ["javascript", "python", "java", "cpp"];
      updatedQuestions[idx].boilerplates = languages.map(lang => {
        if (lang === activeLang && existingBoilerplate && existingBoilerplate.trim()) {
          return { language: lang, code: existingBoilerplate };
        }
        return { language: lang, code: res.data[lang] || "" };
      });
      setTestData({ ...testData, questions: updatedQuestions });
      alert("AI boilerplates generated successfully for JS, Python, Java, and C++!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate boilerplates");
    } finally {
      setAiLoading(prev => ({ ...prev, [idx]: { ...prev[idx], boilerplates: false } }));
    }
  };

  const handleAIGenerateTestCases = async (idx) => {
    const q = testData.questions[idx];
    if (!q.question) {
      alert("Please enter a question description first so the AI has context to generate test cases!");
      return;
    }

    setAiLoading(prev => ({ ...prev, [idx]: { ...prev[idx], testcases: true } }));
    try {
      const res = await api.post("/tests/generate-testcases", {
        question: q.question
      });

      const updatedQuestions = [...testData.questions];
      updatedQuestions[idx].test_cases = res.data.map(tc => ({
        input: tc.input || "",
        output: tc.output || "",
        is_hidden: tc.is_hidden || false
      }));
      setTestData({ ...testData, questions: updatedQuestions });
      alert(`AI generated ${res.data.length} test cases successfully!`);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate test cases");
    } finally {
      setAiLoading(prev => ({ ...prev, [idx]: { ...prev[idx], testcases: false } }));
    }
  };

  const addQuestion = (type) => {
    const newQuestion = {
      type,
      question: "",
      points: 1,
      options: type === "mcq" ? ["", "", "", ""] : [],
      correct_answer: "",
      test_cases: type === "code" ? [{ input: "", output: "", is_hidden: false }] : [],
      boilerplates: type === "code" ? [
        { language: "javascript", code: "// Write JavaScript here\nfunction solution(input) {\n  return input;\n}" },
        { language: "python", code: "# Write Python here\ndef solution(input):\n    return input" },
        { language: "java", code: "// Write Java here\nimport java.util.*;\n\nclass Solution {\n    public int maxProfit(int[] prices) {\n        // Write logic here\n        return 0;\n    }\n}\n\npublic class main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String line = sc.nextLine().trim();\n        if (line.startsWith(\"[\")) line = line.substring(1);\n        if (line.endsWith(\"]\")) line = line.substring(0, line.length() - 1);\n        line = line.trim();\n        int[] prices;\n        if (line.isEmpty()) {\n            prices = new int[0];\n        } else {\n            String[] parts = line.split(\"\\\\s*,\\\\s*|\\\\s+\");\n            prices = new int[parts.length];\n            for (int i = 0; i < parts.length; i++) {\n                prices[i] = Integer.parseInt(parts[i].trim());\n            }\n        }\n        Solution sol = new Solution();\n        System.out.println(sol.maxProfit(prices));\n        sc.close();\n    }\n}" },
        { language: "cpp", code: "// Write C++ here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write logic here\n    return 0;\n}" }
      ] : []
    };
    setTestData({ ...testData, questions: [...testData.questions, newQuestion] });
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...testData.questions];
    updatedQuestions[index][field] = value;
    setTestData({ ...testData, questions: updatedQuestions });
  };

  const handleCreate = async () => {
    if (!testData.title || !testData.start_time || !testData.end_time) {
      alert("Please fill in all required fields (Title, Start Time, End Time)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...testData,
        job_id: jobId,
        start_time: new Date(testData.start_time).toISOString(),
        end_time: new Date(testData.end_time).toISOString()
      };
      await api.post("/tests", payload);
      alert("Test created successfully!");
      navigate("/hr-dashboard");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create test");
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

          {/* AI Proctoring Configuration Settings */}
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-3xl space-y-4">
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-wide flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              AI Proctoring & Exam Security Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "camera_monitoring", label: "Enable Camera Monitoring" },
                { key: "microphone_monitoring", label: "Enable Microphone Monitoring" },
                { key: "detect_multiple_persons", label: "Detect Multiple Persons" },
                { key: "detect_mobile_phone", label: "Detect Mobile Phones" },
                { key: "detect_electronic_devices", label: "Detect Secondary Devices" },
                { key: "face_detection", label: "Detect Face Missing/Covered" },
                { key: "look_away_detection", label: "Detect Looking Away (Left/Right)" },
                { key: "random_screenshot", label: "Random Screenshot Capture" },
                { key: "screenshot_on_violation", label: "Capture Evidence on Violation" },
                { key: "tab_switch_detection", label: "Tab Switching Detection" },
                { key: "full_screen_required", label: "Require Full Screen Mode" },
                { key: "copy_paste_disabled", label: "Disable Copy/Paste" },
                { key: "right_click_disabled", label: "Disable Right Click" }
              ].map((setting) => (
                <div key={setting.key} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-all">
                  <input 
                    type="checkbox" 
                    id={`proct-${setting.key}`}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={testData.proctoring_settings[setting.key]}
                    onChange={(e) => {
                      setTestData({
                        ...testData,
                        proctoring_settings: {
                          ...testData.proctoring_settings,
                          [setting.key]: e.target.checked
                        }
                      });
                    }}
                  />
                  <label htmlFor={`proct-${setting.key}`} className="text-xs font-bold text-gray-700 cursor-pointer">
                    {setting.label}
                  </label>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 block">Maximum Warnings Allowed</label>
                <input 
                  type="number"
                  min={1}
                  max={10}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                  value={testData.proctoring_settings.max_warnings}
                  onChange={(e) => {
                    setTestData({
                      ...testData,
                      proctoring_settings: {
                        ...testData.proctoring_settings,
                        max_warnings: parseInt(e.target.value, 10) || 3
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-2">
                <input 
                  type="checkbox" 
                  id="auto_terminate"
                  className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={testData.proctoring_settings.auto_terminate}
                  onChange={(e) => {
                    setTestData({
                      ...testData,
                      proctoring_settings: {
                        ...testData.proctoring_settings,
                        auto_terminate: e.target.checked
                      }
                    });
                  }}
                />
                <label htmlFor="auto_terminate" className="text-xs font-black text-indigo-900 cursor-pointer">
                  Auto-Terminate Exam After Max Warnings Exceeded
                </label>
              </div>
            </div>
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
                      <div key={tcIdx} className="space-y-2 mb-4 p-3 bg-white border border-gray-100 rounded-xl">
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            placeholder="Input"
                            value={tc.input}
                            onChange={(e) => {
                              const newTcs = [...q.test_cases];
                              newTcs[tcIdx].input = e.target.value;
                              updateQuestion(idx, "test_cases", newTcs);
                            }}
                          />
                          <input 
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            placeholder="Expected Output"
                            value={tc.output}
                            onChange={(e) => {
                              const newTcs = [...q.test_cases];
                              newTcs[tcIdx].output = e.target.value;
                              updateQuestion(idx, "test_cases", newTcs);
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            id={`hidden-${idx}-${tcIdx}`}
                            checked={tc.is_hidden}
                            onChange={(e) => {
                              const newTcs = [...q.test_cases];
                              newTcs[tcIdx].is_hidden = e.target.checked;
                              updateQuestion(idx, "test_cases", newTcs);
                            }}
                          />
                          <label htmlFor={`hidden-${idx}-${tcIdx}`} className="text-xs font-bold text-gray-500">Hidden Test Case (Used for final evaluation, not visible to candidate)</label>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newTcs = [...q.test_cases, { input: "", output: "", is_hidden: false }];
                        updateQuestion(idx, "test_cases", newTcs);
                      }}
                      className="text-xs text-blue-500 font-bold"
                    >
                      + Add Test Case
                    </button>
                  </div>

                  {/* Boilerplate Templates Section */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold">Boilerplate Code Templates</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={aiLoading[idx]?.boilerplates}
                          onClick={() => handleAIGenerateBoilerplates(idx)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 uppercase tracking-wider cursor-pointer"
                        >
                          {aiLoading[idx]?.boilerplates ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Generating...
                            </>
                          ) : (
                            "✨ AI Boilerplates"
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={aiLoading[idx]?.testcases}
                          onClick={() => handleAIGenerateTestCases(idx)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 uppercase tracking-wider cursor-pointer"
                        >
                          {aiLoading[idx]?.testcases ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Generating...
                            </>
                          ) : (
                            "✨ AI Test Cases"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Active Language Tabs */}
                    <div className="flex border-b border-gray-200">
                      {["javascript", "python", "java", "cpp"].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            const updatedLangs = { ...activeLangMap };
                            updatedLangs[idx] = lang;
                            setActiveLangMap(updatedLangs);
                          }}
                          className={`px-4 py-2 text-[10px] font-black uppercase border-b-2 transition-all cursor-pointer ${
                            (activeLangMap[idx] || "javascript") === lang
                              ? "text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                              : "text-gray-400 border-transparent hover:text-gray-600"
                          }`}
                        >
                          {lang === "cpp" ? "C++" : lang}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Template Code (Active Language: {(activeLangMap[idx] || "javascript")})
                      </label>
                      <textarea
                        rows={8}
                        className="w-full p-4 bg-gray-900 text-emerald-400 font-mono text-xs border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none whitespace-pre resize-y"
                        value={
                          q.boilerplates?.find(
                            (b) => b.language === (activeLangMap[idx] || "javascript")
                          )?.code || ""
                        }
                        onChange={(e) => {
                          const activeLang = activeLangMap[idx] || "javascript";
                          const updatedQs = [...testData.questions];
                          if (!updatedQs[idx].boilerplates) {
                            updatedQs[idx].boilerplates = [];
                          }
                          const bp = updatedQs[idx].boilerplates.find(b => b.language === activeLang);
                          if (bp) {
                            bp.code = e.target.value;
                          } else {
                            updatedQs[idx].boilerplates.push({ language: activeLang, code: e.target.value });
                          }
                          setTestData({ ...testData, questions: updatedQs });
                        }}
                      />
                    </div>
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
