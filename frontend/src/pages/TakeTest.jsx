import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Editor from "@monaco-editor/react";

const loadProctoringAI = () => {
  return new Promise((resolve, reject) => {
    if (window.tf && window.blazeface && window.cocoSsd) {
      resolve();
      return;
    }
    
    let tfScript = document.getElementById("tfjs-core-script");
    if (!tfScript) {
      tfScript = document.createElement("script");
      tfScript.id = "tfjs-core-script";
      tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js";
      tfScript.async = true;
      document.body.appendChild(tfScript);
    }
    
    const checkLoaded = setInterval(() => {
      if (window.tf) {
        clearInterval(checkLoaded);
        
        let bfScript = document.getElementById("blazeface-script");
        if (!bfScript) {
          bfScript = document.createElement("script");
          bfScript.id = "blazeface-script";
          bfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js";
          bfScript.async = true;
          document.body.appendChild(bfScript);
        }
        
        let cocoScript = document.getElementById("coco-ssd-script");
        if (!cocoScript) {
          cocoScript = document.createElement("script");
          cocoScript.id = "coco-ssd-script";
          cocoScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";
          cocoScript.async = true;
          document.body.appendChild(cocoScript);
        }
        
        const checkBfAndCocoLoaded = setInterval(() => {
          if (window.blazeface && window.cocoSsd) {
            clearInterval(checkBfAndCocoLoaded);
            resolve();
          }
        }, 100);
      }
    }, 100);
  });
};

const drawFace = (ctx, prediction, color) => {
  const start = prediction.topLeft;
  const end = prediction.bottomRight;
  const size = [end[0] - start[0], end[1] - start[1]];
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const cornerLen = Math.min(size[0], size[1]) * 0.2;
  
  ctx.beginPath();
  ctx.moveTo(start[0] + cornerLen, start[1]);
  ctx.lineTo(start[0], start[1]);
  ctx.lineTo(start[0], start[1] + cornerLen);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(end[0] - cornerLen, start[1]);
  ctx.lineTo(end[0], start[1]);
  ctx.lineTo(end[0], start[1] + cornerLen);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(start[0] + cornerLen, end[1]);
  ctx.lineTo(start[0], end[1]);
  ctx.lineTo(start[0], end[1] - cornerLen);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(end[0] - cornerLen, end[1]);
  ctx.lineTo(end[0], end[1]);
  ctx.lineTo(end[0], end[1] - cornerLen);
  ctx.stroke();
  
  const landmarks = prediction.landmarks;
  if (landmarks) {
    ctx.fillStyle = color;
    for (let i = 0; i < landmarks.length; i++) {
      const x = landmarks[i][0];
      const y = landmarks[i][1];
      if (i <= 3) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x + 6, y);
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x, y + 6);
        ctx.stroke();
      }
    }
  }
};

const drawProgress = (ctx, current, max, label, color) => {
  const width = 180;
  const height = 14;
  const x = 15;
  const y = 78; // Offset down to prevent overlap with HUD text rows
  
  ctx.fillStyle = "rgba(10, 10, 10, 0.75)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  const progressWidth = Math.min(width, (current / max) * width);
  const grad = ctx.createLinearGradient(x, y, x + progressWidth, y);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#ffffff");
  
  ctx.fillStyle = grad;
  ctx.fillRect(x + 1, y + 1, progressWidth - 2, height - 2);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px sans-serif";
  ctx.fillText(`${label.toUpperCase()}... ${Math.round((current / max) * 100)}%`, x + 6, y + 10);
};

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

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [proctorWarnings, setProctorWarnings] = useState(0);
  const [violationAlert, setViolationAlert] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [micError, setMicError] = useState("");
  const [showSimPanel, setShowSimPanel] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(false);
  const [runningAllChecks, setRunningAllChecks] = useState(false);

  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState("");
  const blazefaceModelRef = useRef(null);
  const cocoModelRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const faceMissingTimeRef = useRef(0);
  const multipleFacesTimeRef = useRef(0);
  const lookingAwayTimeRef = useRef(0);
  const lookingUpDownTimeRef = useRef(0);
  const faceDistanceTimeRef = useRef(0);
  const phoneDetectedTimeRef = useRef(0);
  const secondaryDeviceTimeRef = useRef(0);
  const gazeRatioHistoryRef = useRef([]);
  const objectPredictionsRef = useRef([]);

  const rulesVideoRef = useRef(null);
  const activeVideoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const screenshotIntervalRef = useRef(null);

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
      // Fetch initial details
      fetchLatestSubmissionStatus(res.data.submissionId);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to start test");
      navigate("/user-dashboard");
    }
  }, [testId, navigate]);

  const fetchLatestSubmissionStatus = async (subId = submissionId) => {
    if (!subId) return;
    setFetchingStatus(true);
    try {
      const res = await api.get(`/tests/results/${subId}`);
      setSubmissionDetail(res.data);
    } catch (err) {
      console.error("Failed to fetch latest submission detail", err);
    } finally {
      setFetchingStatus(false);
    }
  };

  const runAllChecks = async () => {
    setRunningAllChecks(true);
    try {
      for (let i = 0; i < test.questions.length; i++) {
        const q = test.questions[i];
        if (q.type === 'code') {
          const ans = answers[q._id];
          if (ans && ans.code) {
            await api.post(`/tests/answer/${submissionId}`, {
              question_id: q._id,
              code: ans.code,
              language: ans.language || "javascript"
            });
          }
        }
      }
      await fetchLatestSubmissionStatus();
      alert("All code submissions evaluated successfully against all test cases!");
    } catch (err) {
      console.error("Failed to run final checks", err);
      alert("Failed to run final checks. Please try again.");
    } finally {
      setRunningAllChecks(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchTest();
  }, [fetchUser, fetchTest]);

  // Load BlazeFace and COCO-SSD AI models if camera proctoring is enabled
  useEffect(() => {
    if (test?.proctoring_settings?.camera_monitoring) {
      setModelLoading(true);
      loadProctoringAI()
        .then(() => {
          return Promise.all([
            window.blazeface.load(),
            window.cocoSsd.load()
          ]);
        })
        .then(([bfModel, cocoModel]) => {
          blazefaceModelRef.current = bfModel;
          cocoModelRef.current = cocoModel;
          setModelLoading(false);
        })
        .catch((err) => {
          console.error("AI Model Loading Error:", err);
          setModelError("Failed to load AI proctoring modules. Please refresh.");
          setModelLoading(false);
        });
    }
  }, [test]);

  // COCO-SSD Object Detection loop (throttled to 1Hz)
  useEffect(() => {
    if (!rulesAccepted || !cameraStream || !cocoModelRef.current) return;
    
    let active = true;
    
    const runObjectDetection = async () => {
      if (!active) return;
      const video = activeVideoRef.current;
      const model = cocoModelRef.current;
      
      if (!video || !model || video.readyState < 2) {
        setTimeout(runObjectDetection, 1000);
        return;
      }
      
      try {
        const predictions = await model.detect(video);
        objectPredictionsRef.current = predictions;
        
        // Check for cell phone
        const hasPhone = predictions.some(p => p.class === "cell phone");
        if (hasPhone) {
          if (test?.proctoring_settings?.detect_mobile_phone) {
            phoneDetectedTimeRef.current += 1.0;
            if (phoneDetectedTimeRef.current >= 2.0) {
              triggerViolation("Mobile phone usage detected");
              phoneDetectedTimeRef.current = 0;
            }
          }
        } else {
          phoneDetectedTimeRef.current = 0;
        }
        
        // Check for secondary devices
        const hasDevice = predictions.some(p => p.class === "laptop" || p.class === "tv" || p.class === "monitor");
        if (hasDevice) {
          if (test?.proctoring_settings?.detect_electronic_devices) {
            secondaryDeviceTimeRef.current += 1.0;
            if (secondaryDeviceTimeRef.current >= 3.0) {
              triggerViolation("Secondary electronic device usage detected");
              secondaryDeviceTimeRef.current = 0;
            }
          }
        } else {
          secondaryDeviceTimeRef.current = 0;
        }
        
      } catch (err) {
        console.error("COCO-SSD object detection error", err);
      }
      
      if (active) {
        setTimeout(runObjectDetection, 1000);
      }
    };
    
    const timer = setTimeout(runObjectDetection, 1000);
    
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [rulesAccepted, cameraStream, test]);

  // Real-time AI face tracking loop
  useEffect(() => {
    if (!rulesAccepted || !cameraStream || !blazefaceModelRef.current) return;
    
    let active = true;
    let lastTime = Date.now();
    
    const runDetection = async () => {
      if (!active) return;
      
      const video = activeVideoRef.current;
      const canvas = canvasRef.current;
      const model = blazefaceModelRef.current;
      
      if (!video || !canvas || !model) {
        requestRef.current = requestAnimationFrame(runDetection);
        return;
      }
      
      if (video.readyState < 2) {
        requestRef.current = requestAnimationFrame(runDetection);
        return;
      }
      
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      
      try {
        const predictions = await model.estimateFaces(video, false);
        
        let statusText = "SCAN: SECURE";
        let statusColor = "#059669"; // emerald-600
        let statusLabelText = "FACE: DETECTED";
        let gazeDirection = "center";
        let pitchDirection = "center";
        let distanceStatus = "ok";
        let distRatio = 0.5;
        
        if (predictions.length === 0) {
          statusText = "SCAN: ALERT!";
          statusColor = "#DC2626"; // red-600
          statusLabelText = "NO FACE DETECTED";
          
          if (test?.proctoring_settings?.face_detection) {
            faceMissingTimeRef.current += dt;
            if (faceMissingTimeRef.current >= 3.0) {
              triggerViolation("Candidate's face not visible");
              faceMissingTimeRef.current = 0;
            }
          }
          multipleFacesTimeRef.current = 0;
          lookingAwayTimeRef.current = 0;
          lookingUpDownTimeRef.current = 0;
          faceDistanceTimeRef.current = 0;
          gazeRatioHistoryRef.current = [];
          
        } else if (predictions.length > 1) {
          statusText = "SCAN: ALERT!";
          statusColor = "#DC2626";
          statusLabelText = "MULTIPLE PERSONS";
          
          if (test?.proctoring_settings?.detect_multiple_persons) {
            multipleFacesTimeRef.current += dt;
            if (multipleFacesTimeRef.current >= 2.0) {
              triggerViolation("Multiple persons detected in camera frame");
              multipleFacesTimeRef.current = 0;
            }
          }
          faceMissingTimeRef.current = 0;
          lookingAwayTimeRef.current = 0;
          lookingUpDownTimeRef.current = 0;
          faceDistanceTimeRef.current = 0;
          gazeRatioHistoryRef.current = [];
          
          predictions.forEach(pred => {
            drawFace(ctx, pred, "#DC2626");
          });
          
        } else {
          faceMissingTimeRef.current = 0;
          multipleFacesTimeRef.current = 0;
          
          const pred = predictions[0];
          const landmarks = pred.landmarks;
          
          let gazeRatioVal = 0;
          
          if (landmarks && landmarks.length >= 6) {
            const rightEye = landmarks[0];
            const leftEye = landmarks[1];
            const nose = landmarks[2];
            const mouth = landmarks[3];
            
            // Horizontal eye-to-nose deviation check
            const eyeWidth = Math.abs(rightEye[0] - leftEye[0]);
            const noseOffset = nose[0] - (leftEye[0] + rightEye[0]) / 2;
            
            if (eyeWidth > 0) {
              gazeRatioVal = noseOffset / eyeWidth;
            }
            
            // Vertical pitch (Up/Down) ratio check
            const eyeCenterY = (rightEye[1] + leftEye[1]) / 2;
            const eyeToNoseY = nose[1] - eyeCenterY;
            const eyeToMouthY = mouth[1] - eyeCenterY;
            
            if (eyeToMouthY > 0) {
              const pitchRatioVal = eyeToNoseY / eyeToMouthY;
              if (pitchRatioVal < 0.38) {
                pitchDirection = "down";
              } else if (pitchRatioVal > 0.78) {
                pitchDirection = "up";
              }
            }
          }
          
          // Face distance check
          const faceWidth = pred.bottomRight[0] - pred.topLeft[0];
          distRatio = faceWidth / canvas.width;
          if (distRatio < 0.20) {
            distanceStatus = "too_far";
          } else if (distRatio > 0.72) {
            distanceStatus = "too_close";
          }
          
          gazeRatioHistoryRef.current.push(gazeRatioVal);
          if (gazeRatioHistoryRef.current.length > 10) {
            gazeRatioHistoryRef.current.shift();
          }
          
          const avgGazeRatio = gazeRatioHistoryRef.current.reduce((a, b) => a + b, 0) / gazeRatioHistoryRef.current.length;
          
          if (avgGazeRatio < -0.22) {
            gazeDirection = "right";
          } else if (avgGazeRatio > 0.22) {
            gazeDirection = "left";
          }
          
          if (gazeDirection !== "center") {
            statusText = "SCAN: WARNING!";
            statusColor = "#D97706"; // amber-600
            statusLabelText = `LOOKING ${gazeDirection.toUpperCase()}`;
            
            if (test?.proctoring_settings?.look_away_detection) {
              lookingAwayTimeRef.current += dt;
              if (lookingAwayTimeRef.current >= 2.5) {
                triggerViolation(`Candidate looking ${gazeDirection}`);
                lookingAwayTimeRef.current = 0;
              }
            }
          } else {
            lookingAwayTimeRef.current = 0;
          }
          
          if (pitchDirection !== "center" && gazeDirection === "center") {
            statusText = "SCAN: WARNING!";
            statusColor = "#D97706";
            statusLabelText = `LOOKING ${pitchDirection.toUpperCase()}`;
            
            if (test?.proctoring_settings?.look_away_detection) {
              lookingUpDownTimeRef.current += dt;
              if (lookingUpDownTimeRef.current >= 2.5) {
                triggerViolation(`Candidate looking ${pitchDirection}`);
                lookingUpDownTimeRef.current = 0;
              }
            }
          } else {
            lookingUpDownTimeRef.current = 0;
          }
          
          if (distanceStatus !== "ok" && gazeDirection === "center" && pitchDirection === "center") {
            statusText = "SCAN: WARNING!";
            statusColor = "#D97706";
            statusLabelText = `DISTANCE: ${distanceStatus.replace("_", " ").toUpperCase()}`;
            
            faceDistanceTimeRef.current += dt;
            if (faceDistanceTimeRef.current >= 3.0) {
              triggerViolation(`Candidate too ${distanceStatus === "too_close" ? "close to" : "far from"} camera`);
              faceDistanceTimeRef.current = 0;
            }
          } else {
            faceDistanceTimeRef.current = 0;
          }
          
          drawFace(ctx, pred, statusColor);
          
          if (landmarks && landmarks.length >= 6) {
            const nose = landmarks[2];
            ctx.beginPath();
            ctx.moveTo(nose[0], nose[1]);
            const endX = nose[0] - avgGazeRatio * 150;
            const endY = nose[1];
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = statusColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = statusColor;
            ctx.fill();
          }
        }
        
        // Draw object detections (e.g. mobile phones) on the canvas
        const objects = objectPredictionsRef.current;
        if (objects && objects.length > 0) {
          objects.forEach(obj => {
            if (obj.class === "cell phone" || obj.class === "laptop" || obj.class === "tv" || obj.class === "monitor") {
              const [boxX, boxY, boxW, boxH] = obj.bbox;
              ctx.strokeStyle = "#DC2626";
              ctx.lineWidth = 3;
              ctx.strokeRect(boxX, boxY, boxW, boxH);
              
              ctx.fillStyle = "#DC2626";
              ctx.fillRect(boxX, boxY - 18, Math.min(boxW, 110), 18);
              
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 9px monospace";
              ctx.fillText(obj.class.toUpperCase() + ` ${Math.round(obj.score * 100)}%`, boxX + 5, boxY - 6);
            }
          });
        }
        
        const phoneDetected = objects && objects.some(o => o.class === "cell phone");
        
        ctx.fillStyle = statusColor;
        ctx.font = "bold 11px monospace";
        ctx.fillText(statusText, 15, 22);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px monospace";
        ctx.fillText(statusLabelText, 15, 34);
        
        const devVal = gazeRatioHistoryRef.current.length > 0 
          ? (gazeRatioHistoryRef.current[gazeRatioHistoryRef.current.length - 1]).toFixed(2)
          : "0.00";
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillText(`GAZE DEV: ${devVal}`, 15, 44);
        ctx.fillText(`PHONE: ${phoneDetected ? "DETECTED 🔴" : "NONE 🟢"}`, 15, 54);
        ctx.fillText(`DIST RATIO: ${(distRatio || 0.00).toFixed(2)}`, 15, 64);
        
        if (faceMissingTimeRef.current > 0.3 && test?.proctoring_settings?.face_detection) {
          drawProgress(ctx, faceMissingTimeRef.current, 3.0, "Face Missing Warning", "#DC2626");
        } else if (lookingAwayTimeRef.current > 0.3 && test?.proctoring_settings?.look_away_detection) {
          drawProgress(ctx, lookingAwayTimeRef.current, 2.5, `Looking ${gazeDirection.toUpperCase()}`, "#D97706");
        } else if (lookingUpDownTimeRef.current > 0.3 && test?.proctoring_settings?.look_away_detection) {
          drawProgress(ctx, lookingUpDownTimeRef.current, 2.5, `Looking ${pitchDirection.toUpperCase()}`, "#D97706");
        } else if (faceDistanceTimeRef.current > 0.3) {
          drawProgress(ctx, faceDistanceTimeRef.current, 3.0, `Distance Warning (${distanceStatus.replace("_", " ")})`, "#D97706");
        } else if (multipleFacesTimeRef.current > 0.3 && test?.proctoring_settings?.detect_multiple_persons) {
          drawProgress(ctx, multipleFacesTimeRef.current, 2.0, "Multiple Persons Warning", "#DC2626");
        } else if (phoneDetectedTimeRef.current > 0.3 && test?.proctoring_settings?.detect_mobile_phone) {
          drawProgress(ctx, phoneDetectedTimeRef.current, 2.0, "Phone Warning", "#DC2626");
        } else if (secondaryDeviceTimeRef.current > 0.3 && test?.proctoring_settings?.detect_electronic_devices) {
          drawProgress(ctx, secondaryDeviceTimeRef.current, 3.0, "Device Warning", "#DC2626");
        }
        
      } catch (err) {
        console.error("AI estimation error", err);
      }
      
      requestRef.current = requestAnimationFrame(runDetection);
    };
    
    runDetection();
    
    return () => {
      active = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [rulesAccepted, cameraStream, test]);

  // Media cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.error("Audio Context close error", err));
      }
    };
  }, [cameraStream]);

  // Route camera stream to active video element once rules are accepted
  useEffect(() => {
    if (rulesAccepted && cameraStream && activeVideoRef.current) {
      activeVideoRef.current.srcObject = cameraStream;
    }
  }, [rulesAccepted, cameraStream]);

  // Timer logic
  useEffect(() => {
    const needsProctoring = test?.proctoring_settings?.camera_monitoring || test?.proctoring_settings?.microphone_monitoring || test?.proctoring_settings?.full_screen_required || test?.proctoring_settings?.tab_switch_detection || test?.proctoring_settings?.look_away_detection;
    if (timeLeft <= 0 || loading || (needsProctoring && !rulesAccepted)) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, rulesAccepted, test]);

  // Device Access & Proctoring Helpers
  const startCamera = async (targetVideoRef) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setCameraStream(stream);
      setCameraError("");
      if (targetVideoRef && targetVideoRef.current) {
        targetVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      setCameraError("Camera permission denied or camera not found. Please enable webcam permissions.");
      console.error(err);
      return null;
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicActive(true);
      setMicError("");
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let audioSpikeCount = 0;
      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let values = 0;
        for (let i = 0; i < bufferLength; i++) {
          values += dataArray[i];
        }
        const average = values / bufferLength;
        setMicVolume(Math.round(average));

        if (average > 60) {
          audioSpikeCount++;
          if (audioSpikeCount >= 40) { // 4 seconds
            triggerViolation("Suspicious audio or voice detected");
            audioSpikeCount = 0;
          }
        } else {
          audioSpikeCount = Math.max(0, audioSpikeCount - 1);
        }
      };
      
      const interval = setInterval(checkVolume, 100);
      audioIntervalRef.current = interval;
      return stream;
    } catch (err) {
      setMicError("Microphone permission denied.");
      console.error(err);
      return null;
    }
  };

  const captureWebcamBase64 = () => {
    try {
      const video = activeVideoRef.current || rulesVideoRef.current;
      if (!video) return "";
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Webcam capture error:", err);
      return "";
    }
  };

  const captureAndUploadScreenshot = async () => {
    if (!submissionId || !cameraStream) return;
    const base64 = captureWebcamBase64();
    if (!base64) return;
    try {
      await api.post(`/tests/proctoring/screenshot/${submissionId}`, {
        screenshot: base64
      });
    } catch (err) {
      console.error("Error uploading periodic screenshot:", err);
    }
  };

  const triggerViolation = async (violationType) => {
    if (!submissionId) return;
    let screenshotData = "";
    if (test?.proctoring_settings?.screenshot_on_violation && cameraStream) {
      screenshotData = captureWebcamBase64();
    }
    
    try {
      const res = await api.post(`/tests/proctoring/violation/${submissionId}`, {
        violation_type: violationType,
        screenshot: screenshotData
      });
      
      const { warnings_count, terminated } = res.data;
      setProctorWarnings(warnings_count);
      
      if (terminated) {
        bypassTabSwitch.current = true;
        alert(`Assessment terminated! You exceeded the maximum warnings allowed (${test?.proctoring_settings?.max_warnings}).`);
        navigate("/user-dashboard");
      } else {
        setViolationAlert({
          type: violationType,
          warning: warnings_count,
          max: test?.proctoring_settings?.max_warnings
        });
        setTimeout(() => {
          setViolationAlert(null);
        }, 5000);
      }
    } catch (error) {
      console.error("Error triggering violation:", error);
    }
  };

  const enterFullScreen = async () => {
    const docEl = document.documentElement;
    const requestFS = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
    if (requestFS) {
      try {
        await requestFS.call(docEl);
        setIsFullScreen(true);
        return true;
      } catch (err) {
        console.error("Failed to enter fullscreen", err);
        return false;
      }
    }
    return false;
  };

  const handleStartExam = async () => {
    const needsCamera = test?.proctoring_settings?.camera_monitoring;
    const needsMic = test?.proctoring_settings?.microphone_monitoring;
    if (needsCamera && !cameraStream) {
      alert("You must grant camera access and enable the camera stream to proceed.");
      return;
    }
    if (needsMic && !micActive) {
      alert("You must grant microphone access to proceed.");
      return;
    }

    if (test?.proctoring_settings?.full_screen_required) {
      await enterFullScreen();
    }

    setRulesAccepted(true);

    if (needsCamera && test?.proctoring_settings?.random_screenshot) {
      screenshotIntervalRef.current = setInterval(captureAndUploadScreenshot, 25000);
    }
  };

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
      if (test?.proctoring_settings && !test.proctoring_settings.tab_switch_detection) {
        return;
      }
      try {
        const res = await api.put(`/tests/tab-switch/${submissionId}`);
        if (res.data.terminated) {
          bypassTabSwitch.current = true;
          alert("Test terminated due to security policy violation (multiple tab switches)!");
          navigate("/user-dashboard");
        } else {
          setTabSwitches(res.data.tab_switches);
          setProctorWarnings(res.data.warnings || res.data.tab_switches);
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
  }, [submissionId, loading, navigate, test]);

  // Copy-paste disable listener
  useEffect(() => {
    if (!rulesAccepted || !test?.proctoring_settings?.copy_paste_disabled) return;
    const preventCopyPaste = (e) => {
      e.preventDefault();
      bypassTabSwitch.current = true;
      alert("Security Policy: Copying and pasting is disabled during the assessment.");
      setTimeout(() => {
        bypassTabSwitch.current = false;
      }, 100);
    };
    window.addEventListener("copy", preventCopyPaste);
    window.addEventListener("paste", preventCopyPaste);
    return () => {
      window.removeEventListener("copy", preventCopyPaste);
      window.removeEventListener("paste", preventCopyPaste);
    };
  }, [rulesAccepted, test]);

  // Right-click disable listener
  useEffect(() => {
    if (!rulesAccepted || !test?.proctoring_settings?.right_click_disabled) return;
    const preventRightClick = (e) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", preventRightClick);
    return () => {
      window.removeEventListener("contextmenu", preventRightClick);
    };
  }, [rulesAccepted, test]);

  // Fullscreen change listener
  useEffect(() => {
    if (!rulesAccepted || !test?.proctoring_settings?.full_screen_required) return;
    
    const checkFullScreen = () => {
      const isFS = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullScreen(isFS);
      if (!isFS) {
        triggerViolation("Exited full screen mode");
      }
    };
    
    document.addEventListener("fullscreenchange", checkFullScreen);
    document.addEventListener("webkitfullscreenchange", checkFullScreen);
    document.addEventListener("mozfullscreenchange", checkFullScreen);
    document.addEventListener("MSFullscreenChange", checkFullScreen);
    
    // Set initial state
    const initialFS = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    setIsFullScreen(initialFS);
    
    return () => {
      document.removeEventListener("fullscreenchange", checkFullScreen);
      document.removeEventListener("webkitfullscreenchange", checkFullScreen);
      document.removeEventListener("mozfullscreenchange", checkFullScreen);
      document.removeEventListener("MSFullscreenChange", checkFullScreen);
    };
  }, [rulesAccepted, test]);

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
    fetchLatestSubmissionStatus();
    setShowSubmitModal(true);
  };

  const confirmFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/tests/finalize/${submissionId}`);
      if (test.show_marks) {
        alert(`Test submitted! Your total score: ${res.data.total_score}`);
      } else {
        alert("Test submitted successfully! Your results will be reviewed by HR.");
      }
      setShowSubmitModal(false);
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

  const needsProctoring = test?.proctoring_settings?.camera_monitoring || test?.proctoring_settings?.microphone_monitoring || test?.proctoring_settings?.full_screen_required || test?.proctoring_settings?.tab_switch_detection || test?.proctoring_settings?.look_away_detection;

  if (test && needsProctoring && !rulesAccepted) {
    return (
      <div className="min-h-screen bg-[#141414] text-[#eff1f6] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-4xl bg-[#1e1e1e] border border-[#2e2e2e] rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 p-3 rounded-2xl mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h1 className="text-2xl font-black tracking-wide uppercase">AI-Proctored Assessment Onboarding</h1>
            <p className="text-sm text-gray-400">Please complete the hardware checklist and review the instructions before beginning.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Left: Rules Guidelines */}
            <div className="space-y-4">
              <div className="p-5 bg-rose-950/20 border border-rose-900/30 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  ❌ STRICT DONT's (Violations)
                </h3>
                <ul className="text-xs text-rose-300/80 space-y-2 list-disc list-inside leading-relaxed">
                  {test.proctoring_settings.tab_switch_detection && <li>Do NOT switch browser tabs or minimize the window.</li>}
                  {test.proctoring_settings.face_detection && <li>Do NOT block the camera or cover your face.</li>}
                  {test.proctoring_settings.look_away_detection && <li>Do NOT look away (left or right) for a sustained period.</li>}
                  {test.proctoring_settings.detect_multiple_persons && <li>Do NOT allow other people to enter the camera frame.</li>}
                  {test.proctoring_settings.detect_mobile_phone && <li>Do NOT use mobile phones, tablets, or cheat sheets.</li>}
                  {test.proctoring_settings.detect_electronic_devices && <li>Do NOT use smartwatches, headphones, or secondary devices.</li>}
                  {test.proctoring_settings.microphone_monitoring && <li>Do NOT speak aloud or carry on conversations.</li>}
                  {test.proctoring_settings.copy_paste_disabled && <li>Copy-Paste operations are strictly disabled.</li>}
                </ul>
              </div>

              <div className="p-5 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  ✅ REQUIRED DO's (Rules)
                </h3>
                <ul className="text-xs text-emerald-300/80 space-y-2 list-disc list-inside leading-relaxed">
                  <li>Ensure your room is well lit and camera is centered.</li>
                  <li>Remain sitting in front of your device.</li>
                  {test.proctoring_settings.full_screen_required && <li>You will be placed in full-screen mode automatically.</li>}
                  <li>Complete the assessment within {test.duration} minutes.</li>
                </ul>
              </div>
            </div>

            {/* Right: Hardware preview & validation checks */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Device Hardware Checklist</h3>
              
              {test.proctoring_settings.camera_monitoring && (
                <div className="bg-[#242424] border border-[#333] p-4 rounded-2xl flex flex-col items-center gap-3">
                  <div className="flex justify-between w-full text-[10px] font-bold uppercase text-gray-500">
                    <span>Camera Verification</span>
                    {modelLoading ? (
                      <span className="text-amber-500 animate-pulse">Loading AI Proctoring (Face & Device)...</span>
                    ) : modelError ? (
                      <span className="text-rose-500">{modelError}</span>
                    ) : (blazefaceModelRef.current && cocoModelRef.current) ? (
                      <span className="text-emerald-500">AI Proctoring Active ✅</span>
                    ) : (
                      <span className="text-gray-500">AI Proctoring Offline</span>
                    )}
                  </div>
                  <div className="w-full aspect-video max-w-[280px] bg-black rounded-xl overflow-hidden border border-[#444] relative flex items-center justify-center">
                    <video ref={rulesVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    {!cameraStream && (
                      <div className="absolute inset-0 bg-[#0f0f0f] flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-xs font-bold text-gray-400 mb-2">Webcam preview inactive</span>
                        <button 
                          onClick={() => startCamera(rulesVideoRef)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black tracking-wide cursor-pointer transition-all uppercase border-none text-white shadow-lg"
                        >
                          Enable Webcam
                        </button>
                      </div>
                    )}
                  </div>
                  {cameraError && <p className="text-[10px] font-bold text-rose-400 text-center">{cameraError}</p>}
                </div>
              )}

              {test.proctoring_settings.microphone_monitoring && (
                <div className="bg-[#242424] border border-[#333] p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Microphone Input Check</span>
                    {!micActive && (
                      <button 
                        onClick={startMicrophone}
                        className="px-3 py-1 bg-[#333] hover:bg-[#444] text-gray-300 rounded-lg text-[10px] font-black cursor-pointer uppercase border border-[#444]"
                      >
                        Enable Microphone
                      </button>
                    )}
                  </div>
                  {micActive ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
                        <span>Audio level</span>
                        <span>{micVolume}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-75" 
                          style={{ width: `${Math.min(100, (micVolume / 80) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] font-medium text-gray-500">Allow microphone access to verify your audio input levels.</p>
                  )}
                  {micError && <p className="text-[10px] font-bold text-rose-400">{micError}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-[#2e2e2e] flex flex-col items-center gap-4">
            <div className="flex items-start gap-3 max-w-xl">
              <input 
                type="checkbox" 
                id="agree-checkbox"
                className="w-5 h-5 rounded border-[#444] bg-[#242424] text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                onChange={(e) => {
                  if (e.target.checked) {
                    if (test.proctoring_settings.camera_monitoring && !cameraStream) {
                      startCamera(rulesVideoRef);
                    }
                    if (test.proctoring_settings.microphone_monitoring && !micActive) {
                      startMicrophone();
                    }
                  }
                }}
              />
              <label htmlFor="agree-checkbox" className="text-xs text-gray-400 font-medium leading-relaxed cursor-pointer select-none">
                I acknowledge that this exam is monitored by automated proctoring software. I consent to webcam captures, audio monitoring, and fullscreen constraints, and agree to follow all exam policies.
              </label>
            </div>

            <button
              onClick={handleStartExam}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-wider cursor-pointer transition-all shadow-xl shadow-indigo-900/30 border-none"
            >
              Start Exam Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Floating Webcam Proctoring Feed */}
      {rulesAccepted && test?.proctoring_settings?.camera_monitoring && (
        <div className="fixed bottom-4 left-4 w-48 aspect-video bg-black rounded-2xl overflow-hidden border-2 border-indigo-600/50 shadow-2xl z-50 hover:scale-105 transition-all relative">
          <video ref={activeVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute top-1 right-1 bg-indigo-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full text-white tracking-widest animate-pulse">
            Active
          </div>
        </div>
      )}

      {/* Dev Mode Proctoring Simulation Controls */}
      {rulesAccepted && showSimPanel && (
        <div className="fixed bottom-4 right-4 w-72 bg-[#1e1e1e] border-2 border-amber-600/40 p-4 rounded-3xl shadow-2xl z-[90] space-y-3 font-sans">
          <div className="flex justify-between items-center border-b border-[#333] pb-2">
            <span className="text-xs font-black uppercase text-amber-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Developer Proctor Sim
            </span>
            <button 
              onClick={() => setShowSimPanel(false)}
              className="text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer"
            >
              Hide
            </button>
          </div>
          
          <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
            Use this panel to simulate real-time AI computer vision & audio warnings during testing.
          </p>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase">
            <button 
              onClick={() => triggerViolation("Candidate's face not visible")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Face Missing
            </button>
            <button 
              onClick={() => triggerViolation("Candidate left the camera frame")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Leaves Frame
            </button>
            <button 
              onClick={() => triggerViolation("Multiple persons detected in camera frame")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Multiple People
            </button>
            <button 
              onClick={() => triggerViolation("Mobile phone usage detected")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Phone Detected
            </button>
            <button 
              onClick={() => triggerViolation("Secondary electronic device usage detected")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Smartwatch
            </button>
            <button 
              onClick={() => triggerViolation("Suspicious audio or voice detected")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Loud Noise
            </button>
            <button 
              onClick={() => triggerViolation("Candidate looking left")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Look Left
            </button>
            <button 
              onClick={() => triggerViolation("Candidate looking right")}
              className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Look Right
            </button>
          </div>
          <div className="p-2 bg-[#262626] border border-[#3e3e3e] rounded-xl flex justify-between items-center text-[9px] font-black uppercase text-gray-400">
            <span>Violations Logged:</span>
            <span className="text-amber-500 font-mono font-bold text-[11px]">{proctorWarnings}</span>
          </div>
        </div>
      )}

      {/* Proctor Warning Toast Overlay */}
      {violationAlert && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] animate-fade-in">
          <div className="w-full max-w-md bg-[#242424] border border-rose-500/30 p-8 rounded-3xl text-center space-y-5 shadow-2xl relative">
            <div className="inline-flex bg-rose-950/50 text-rose-500 border border-rose-500/20 p-4 rounded-2xl animate-bounce">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase text-rose-500 tracking-wide">Proctoring Warning!</h2>
              <p className="text-sm font-black text-white">{violationAlert.type}</p>
              <p className="text-xs text-gray-400 leading-relaxed mt-2">
                Your actions have been logged as a security violation. Evidence screenshot has been captured.
              </p>
            </div>
            <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-2xl flex justify-between items-center text-xs font-bold text-rose-400 uppercase">
              <span>Warning Count:</span>
              <span>{violationAlert.warning} / {violationAlert.max}</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest pt-2">DO NOT LEAVE OR ALTER YOUR STATE</p>
          </div>
        </div>
      )}
      
      {/* Secure Fullscreen Pause Overlay */}
      {rulesAccepted && test?.proctoring_settings?.full_screen_required && !isFullScreen && (
        <div className="fixed inset-0 bg-[#121212]/95 backdrop-blur-md flex flex-col items-center justify-center z-[100] animate-fade-in p-6">
          <div className="w-full max-w-md bg-[#1e1e1e] border-2 border-amber-500/40 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
            <div className="inline-flex bg-amber-950/50 text-amber-500 border border-amber-500/20 p-4 rounded-2xl animate-pulse">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4" /></svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase text-amber-500 tracking-wide">Assessment Paused</h2>
              <p className="text-sm font-bold text-white">Fullscreen Mode Required</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Security policy requires fullscreen mode during this assessment to prevent tab switching and unauthorized access.
              </p>
            </div>
            <button
              onClick={enterFullScreen}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-lg active:scale-95 border-none outline-none"
            >
              Re-enter Full Screen
            </button>
          </div>
        </div>
      )}

      {/* Final Assessment Summary Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-[#121212]/90 backdrop-blur-md flex items-center justify-center z-[110] animate-fadeIn p-6">
          <div className="w-full max-w-2xl bg-[#1e1e1e] border border-[#2e2e2e] p-8 rounded-3xl space-y-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase text-indigo-400 tracking-wide">Final Assessment Summary</h2>
              <p className="text-xs text-gray-400">
                Review your answers, coding status, and test case pass rates before confirming your submission.
              </p>
            </div>

            {fetchingStatus ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-400 tracking-wider">GENERATING REPORT...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div className="grid gap-3">
                  {test?.questions.map((q, idx) => {
                    const ans = submissionDetail?.answers?.find(a => a.question_id.toString() === q._id.toString());
                    const isAnswered = q.type === 'code' 
                      ? !!answers[q._id]?.code 
                      : (q.type === 'mcq' ? !!answers[q._id]?.answer : !!answers[q._id]?.answer);
                    
                    let statusText = "Unanswered ❌";
                    let statusColor = "bg-rose-950/40 text-rose-400 border border-rose-500/20";
                    
                    if (isAnswered) {
                      if (q.type === 'code') {
                        const cases = ans?.cases || [];
                        const total = cases.length;
                        const passed = cases.filter(c => c.passed).length;
                        if (total > 0) {
                          statusText = `${passed}/${total} Test Cases Passed`;
                          statusColor = passed === total
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-950/60 text-amber-400 border border-amber-500/20";
                        } else {
                          statusText = "Code Saved (Pending check) ✅";
                          statusColor = "bg-indigo-950/60 text-indigo-400 border border-indigo-500/20";
                        }
                      } else {
                        statusText = "Answered ✅";
                        statusColor = "bg-emerald-950/60 text-emerald-400 border border-emerald-500/20";
                      }
                    }

                    return (
                      <div key={q._id} className="p-4 bg-[#262626] border border-[#3e3e3e] rounded-2xl flex justify-between items-center transition-all hover:bg-[#2e2e2e]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500">Question {idx + 1}</span>
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-[#333] text-gray-400 tracking-wider">{q.type}</span>
                          </div>
                          <p className="text-xs font-bold text-white truncate max-w-[320px]">{q.question}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {q.type === 'code' && isAnswered && (
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mr-1">
                              {answers[q._id]?.language}
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#2e2e2e] flex flex-col gap-3">
              {test?.questions.some(q => q.type === 'code' && !!answers[q._id]?.code) && (
                <button
                  onClick={runAllChecks}
                  disabled={runningAllChecks || fetchingStatus}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border-none outline-none shadow-lg shadow-emerald-900/10"
                >
                  {runningAllChecks ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Running All Code Submissions...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Run Final Code Checks (Submit All)
                    </>
                  )}
                </button>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    bypassTabSwitch.current = false;
                  }}
                  disabled={runningAllChecks || fetchingStatus}
                  className="flex-1 py-3.5 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all border border-[#3e3e3e]"
                >
                  Cancel & Resume
                </button>
                <button
                  onClick={confirmFinalSubmit}
                  disabled={runningAllChecks || fetchingStatus || submitting}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-lg shadow-indigo-900/30 border-none outline-none"
                >
                  {submitting ? "Submitting..." : "Confirm Submission"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      
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
