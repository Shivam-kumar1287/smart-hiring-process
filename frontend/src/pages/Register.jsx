import { useState } from "react";
import api from "../utils/api";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });
  const [loading, setLoading] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const register = async () => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", form);
      if (res.data.requiresOtp) {
        setRequiresOtp(true);
        alert(res.data.message);
      } else {
        alert("Registered Successfully! Please login.");
        navigate("/");
      }
    } catch (err) {
      const errorMessage = err.response?.data || "Registration failed";
      alert(errorMessage);
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-register", { email: form.email, otp });
      alert(res.data.message || "Registration Successful!");
      navigate("/");
    } catch (err) {
      alert(err.response?.data || "OTP Verification failed");
      console.error("OTP Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gray-900 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px] opacity-40 animate-pulse-slow object-delay"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] opacity-40 animate-pulse-slow"></div>

      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl shadow-2xl animate-slideInUp">
        <div className="text-center mb-10">
          <Logo size="xl" light={true} showText={false} className="mb-6 drop-shadow-xl" />
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-300">Join us to accelerate your career journey.</p>
        </div>

        {!requiresOtp ? (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">Full Name</label>
            <div className="relative">
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input 
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                name="name" 
                placeholder="John Doe" 
                onChange={handleChange} 
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">Email Address</label>
            <div className="relative">
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              <input 
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                name="email" 
                type="email"
                placeholder="john@example.com" 
                onChange={handleChange} 
                required
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">Password</label>
            <div className="relative">
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input 
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                name="password" 
                type="password" 
                placeholder="Create a strong password"
                onChange={handleChange} 
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">I am a...</label>
            <div className="relative">
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <select 
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 appearance-none focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                name="role" 
                onChange={handleChange}
              >
                <option value="user" className="bg-gray-800">Job Seeker</option>
                <option value="hr" className="bg-gray-800">HR / Recruiter</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <button 
            onClick={register}
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <span>Create Account</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          <p className="text-center text-gray-400 mt-4">
            Already have an account?{" "}
            <Link to="/" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-200">Enter OTP</label>
              <div className="relative">
                <input 
                  className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300 text-center tracking-[0.5em] text-lg"
                  name="otp" 
                  type="text"
                  placeholder="------" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)} 
                  required
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">We sent a 6-digit code to {form.email}</p>
            </div>

            <button 
              onClick={verifyOtp}
              disabled={loading || !otp}
              className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>Verify & Complete</span>
              )}
            </button>
            <button 
              onClick={() => setRequiresOtp(false)}
              className="w-full text-gray-400 hover:text-white transition-colors text-sm"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}