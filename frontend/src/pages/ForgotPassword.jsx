import { useState } from "react";
import api from "../utils/api";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [otpSent, setOtpSent] = useState(false);

  const sendOtp = async () => {
    if (!email) return alert("Please enter your email");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      alert(res.data.message || "OTP Sent!");
      setOtpSent(true);
    } catch (err) {
      alert(err.response?.data || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!otp || !newPassword) return alert("Please fill all fields");
    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { email, otp, newPassword });
      alert(res.data.message || "Password reset successfully!");
      navigate("/");
    } catch (err) {
      alert(err.response?.data || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gray-900 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600 rounded-full blur-[120px] opacity-40 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] opacity-40 animate-pulse-slow object-delay"></div>

      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl shadow-2xl animate-slideInUp">
        <div className="text-center mb-10">
          <Logo size="xl" light={true} showText={false} className="mb-6 drop-shadow-xl" />
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-300">Recover your account securely.</p>
        </div>

        {!otpSent ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Email Address</label>
              <div className="relative">
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <input 
                  className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all duration-300"
                  type="email"
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                />
              </div>
            </div>

            <button 
              onClick={sendOtp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>Send OTP</span>
              )}
            </button>
            <p className="text-center text-gray-400">
              <Link to="/" className="text-pink-400 hover:text-pink-300 font-medium transition-colors">
                Back to Login
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Enter OTP</label>
              <div className="relative">
                <input 
                  className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all duration-300 text-center tracking-[0.5em] text-lg"
                  type="text"
                  placeholder="------" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)} 
                  required
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">We sent a 6-digit code to {email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">New Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input 
                  className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all duration-300"
                  type="password" 
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required
                />
              </div>
            </div>

            <button 
              onClick={resetPassword}
              disabled={loading || !otp || !newPassword}
              className="w-full bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>Update Password</span>
              )}
            </button>
            <button 
              onClick={() => setOtpSent(false)}
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
