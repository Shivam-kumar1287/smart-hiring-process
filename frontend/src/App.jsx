import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Jobs from "./pages/Jobs";
import Apply from "./pages/Apply";
import UserDashboard from "./pages/UserDashboard";
import HRDashboard from "./pages/HRDashboard";
import Profile from "./pages/Profile";
import SavedJobs from "./pages/SavedJobs";
import Features from "./pages/Features";
import AIAnalyzer from "./pages/AIAnalyzer";
import CreateTest from "./pages/CreateTest";
import TakeTest from "./pages/TakeTest";
import TestResults from "./pages/TestResults";
import MeetingRoom from "./pages/MeetingRoom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/features" element={<Features />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/analyzer" element={<AIAnalyzer />} />
        <Route path="/apply/:id" element={<Apply />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/hr-dashboard" element={<HRDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/saved-jobs" element={<SavedJobs />} />
        <Route path="/create-test/:jobId" element={<CreateTest />} />
        <Route path="/take-test/:testId" element={<TakeTest />} />
        <Route path="/test-results/:submissionId" element={<TestResults />} />
        <Route path="/meeting/:meetingLink" element={<MeetingRoom />} />
      </Routes>

    </Router>
  );
}

export default App;