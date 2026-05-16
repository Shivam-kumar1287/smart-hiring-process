import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function MeetingRoom() {
  const { meetingLink } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [quality, setQuality] = useState("HD");
  const [networkStatus, setNetworkStatus] = useState("Excellent");

  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const pollingRef = useRef(null);
  const localStreamRef = useRef(null);

  const isCaller = localStorage.getItem("userRole") === "hr";

  useEffect(() => {
    fetchMeeting();
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => {
      clearInterval(interval);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const fetchMeeting = async () => {
    try {
      const res = await api.get(`/meetings/link/${meetingLink}`);
      setMeeting(res.data);
      setLoading(false);

      if (isCaller) {
        // Clear old signals when Host enters
        await api.delete(`/meetings/link/${meetingLink}/signal`);
      }

      startCameraAndRTC();
    } catch (err) {
      alert("Invalid meeting link");
      navigate("/dashboard");
    }
  };

  const startCameraAndRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });
      pcRef.current = pc;

      // Add local tracks to WebRTC
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      if (isCaller) {
        const dc = pc.createDataChannel("chat");
        dcRef.current = dc;
        dc.onmessage = (e) => {
          setChat(prev => [...prev, { sender: meeting.candidate_id.name, text: e.data, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        };
      } else {
        pc.ondatachannel = (event) => {
          const dc = event.channel;
          dcRef.current = dc;
          dc.onmessage = (e) => {
            setChat(prev => [...prev, { sender: meeting.hr_id.name, text: e.data, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          };
        };
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setNetworkStatus("Connected");
      };

      // Handle local ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await api.put(`/meetings/link/${meetingLink}/signal`, {
            candidate: JSON.stringify(event.candidate),
            isCaller
          });
        }
      };

      // Signaling loop variables
      const addedCandidates = new Set();
      let remoteDescriptionSet = false;

      // Start signaling poll loop
      pollingRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/meetings/link/${meetingLink}`);
          const meetingData = res.data;

          if (isCaller) {
            // HR is Caller -> Sends Offer, Waits for Answer
            if (!pc.localDescription) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await api.put(`/meetings/link/${meetingLink}/signal`, { offer: JSON.stringify(offer) });
            }

            if (meetingData.answer && !remoteDescriptionSet) {
              const answer = JSON.parse(meetingData.answer);
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              remoteDescriptionSet = true;
            }

            if (meetingData.calleeCandidates) {
              meetingData.calleeCandidates.forEach(candStr => {
                if (!addedCandidates.has(candStr)) {
                  addedCandidates.add(candStr);
                  pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr))).catch(e => {});
                }
              });
            }
          } else {
            // Candidate is Callee -> Applies Offer, Sends Answer
            if (meetingData.offer && !remoteDescriptionSet) {
              const offer = JSON.parse(meetingData.offer);
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              remoteDescriptionSet = true;

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await api.put(`/meetings/link/${meetingLink}/signal`, { answer: JSON.stringify(answer) });
            }

            if (meetingData.callerCandidates) {
              meetingData.callerCandidates.forEach(candStr => {
                if (!addedCandidates.has(candStr)) {
                  addedCandidates.add(candStr);
                  pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr))).catch(e => {});
                }
              });
            }
          }
        } catch (err) {
          console.error("Error in RTC signaling poll:", err);
        }
      }, 2000);

    } catch (err) {
      console.error("Error accessing camera / setting WebRTC:", err);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ":" : ""}${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    if (dcRef.current && dcRef.current.readyState === "open") {
      dcRef.current.send(message);
    }
    
    setChat([...chat, { sender: "Me", text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setMessage("");
  };

  if (loading) return (
    <div className="h-screen bg-[#0f172a] flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg font-bold tracking-widest">CONNECTING TO SECURE SERVER...</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#0f172a] text-slate-200 flex flex-col overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-16 bg-[#1e293b]/50 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight">{meeting.title}</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Meeting • {formatTime(timer)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Connection</span>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-tighter">{networkStatus}</span>
            </div>
            <div className="w-px h-6 bg-slate-700"></div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Quality</span>
              <span className="text-[11px] font-black text-blue-400">{quality}</span>
            </div>
          </div>

          <button 
            onClick={() => { if(window.confirm("Leave meeting?")) navigate("/dashboard"); }}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-rose-900/20 uppercase tracking-widest"
          >
            Leave Meeting
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* Left Side: Video Streams */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
            {/* Remote Participant (Candidate/HR) */}
            <div className="relative bg-[#1e293b] rounded-3xl overflow-hidden border border-slate-700/50 group shadow-2xl">
              {remoteStream ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                   <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white shadow-xl">
                        {isCaller ? meeting.candidate_id.name[0] : meeting.hr_id.name[0]}
                      </div>
                      <p className="text-xl font-black text-white">{isCaller ? meeting.candidate_id.name : meeting.hr_id.name}</p>
                      <p className="text-sm text-slate-400 font-medium">Waiting for participant to join...</p>
                   </div>
                </div>
              )}
              <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-3">
                <span className="text-xs font-bold text-white">{isCaller ? meeting.candidate_id.name : meeting.hr_id.name}</span>
                {!remoteStream && (
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                )}
              </div>
            </div>

            {/* Local Stream (Me) */}
            <div className="relative bg-[#1e293b] rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl">
              {isCameraOff ? (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                   <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center">
                     <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   </div>
                </div>
              ) : (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              )}
              <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-3">
                <span className="text-xs font-bold text-white">Me (You)</span>
                {isMuted && <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM10 3L20 21" /></svg>}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="h-20 bg-[#1e293b]/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] flex items-center justify-center gap-4 px-8 shadow-2xl">
             <button 
               onClick={() => setIsMuted(!isMuted)}
               className={`p-4 rounded-2xl transition-all active:scale-95 ${isMuted ? "bg-rose-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
             >
               {isMuted ? (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM10 3L20 21" /></svg>
               ) : (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
               )}
             </button>

             <button 
               onClick={() => setIsCameraOff(!isCameraOff)}
               className={`p-4 rounded-2xl transition-all active:scale-95 ${isCameraOff ? "bg-rose-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
             >
               {isCameraOff ? (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM10 3L20 21" /></svg>
               ) : (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               )}
             </button>

             <button 
               onClick={() => setIsScreenSharing(!isScreenSharing)}
               className={`p-4 rounded-2xl transition-all active:scale-95 ${isScreenSharing ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             </button>

             <button 
               onClick={() => setShowChat(!showChat)}
               className={`p-4 rounded-2xl transition-all active:scale-95 relative ${showChat ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
               {!showChat && chat.length > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#1e293b]"></span>}
             </button>
          </div>
        </div>

        {/* Right Side: Sidebar Panels */}
        <div className="w-96 flex flex-col gap-4 overflow-hidden">
          {/* Chat Panel */}
          {showChat && (
            <div className="flex-1 bg-[#1e293b] rounded-3xl border border-slate-700/50 flex flex-col overflow-hidden shadow-2xl">
               <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Live Chat</h3>
                  <button onClick={() => setShowChat(false)} className="text-slate-500 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chat.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                       <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                       <p className="text-xs font-bold uppercase tracking-tighter">No messages yet</p>
                    </div>
                  ) : (
                    chat.map((msg, idx) => (
                      <div key={idx} className="flex flex-col">
                         <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>{msg.sender}</span>
                            <span>{msg.time}</span>
                         </div>
                         <div className="bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-700/50 text-sm">
                            {msg.text}
                         </div>
                      </div>
                    ))
                  )}
               </div>
               <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/50 border-t border-slate-700 flex gap-2">
                  <input 
                    type="text" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all active:scale-95">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
               </form>
            </div>
          )}

          {/* Overview Panel */}
          <div className={`${showChat ? 'h-1/2' : 'flex-1'} bg-[#1e293b] rounded-3xl border border-slate-700/50 flex flex-col overflow-hidden shadow-2xl`}>
             <div className="p-5 border-b border-slate-700">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">Meeting Overview</h3>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Participant Profiles</h4>
                   <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black">{meeting.hr_id.name[0]}</div>
                        <div>
                           <p className="text-xs font-black">{meeting.hr_id.name}</p>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Host (HR)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-black">{meeting.candidate_id.name[0]}</div>
                        <div>
                           <p className="text-xs font-black">{meeting.candidate_id.name}</p>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Candidate</p>
                        </div>
                      </div>
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Candidate Skills</h4>
                   <div className="flex flex-wrap gap-2">
                      {meeting.candidate_id.skills?.[0]?.split(',').slice(0, 5).map((skill, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-800 text-[10px] font-bold text-slate-300 rounded-lg border border-slate-700">{skill.trim()}</span>
                      ))}
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Interview Notes</h4>
                   <textarea 
                     className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                     placeholder="Type interview notes here..."
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
