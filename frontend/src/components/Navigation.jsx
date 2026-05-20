import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;
  const isAuthenticated = !!localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  return (
    <nav className="sticky top-0 z-50 w-full mb-8 animate-fadeIn">
      <div className="absolute inset-0 bg-white dark:bg-gray-900 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300"></div>
      
      <div className="relative max-w-6xl mx-auto px-6 sm:px-12 lg:px-16">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div 
              onClick={() => navigate(isAuthenticated ? (userRole === "hr" ? "/hr-dashboard" : "/user-dashboard") : "/")}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Logo size="md" />
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <button
              onClick={() => navigate("/analyzer")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${
                isActive("/analyzer") 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-inner" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900"
              }`}
            >
              AI Analyzer
            </button>
            <button
              onClick={() => navigate("/features")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${
                isActive("/features") 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-inner" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900"
              }`}
            >
              Features
            </button>
            <button
              onClick={() => navigate("/jobs")}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${
                isActive("/jobs") 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-inner" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900"
              }`}
            >
              Jobs
            </button>
            
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/profile")}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${
                    isActive("/profile") 
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-inner" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900"
                  }`}
                >
                  Profile
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2 hidden sm:block"></div>

                <button
                  onClick={handleLogout}
                  className="group relative ml-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-black rounded-xl border border-rose-200/50 dark:border-rose-800/50 transition-all duration-300 flex items-center gap-2 overflow-hidden shadow-sm hover:shadow-md active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 transition-transform group-active:scale-90">Logout</span>
                  <svg className="w-4 h-4 hidden sm:block relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="ml-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
