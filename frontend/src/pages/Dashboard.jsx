import { useEffect, useState } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    // Get user profile to determine role
    api.get("/auth/profile").then((res) => {
      const userRole = res.data.role;

      // Redirect based on user role
      if (userRole === "hr") {
        navigate("/hr-dashboard");
      } else if (userRole === "user") {
        navigate("/user-dashboard");
      } else if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/jobs");
      }
    }).catch(() => {
      // If profile fails, try admin endpoint
      api.get("/admin/stats").then(() => {
        navigate("/admin");
      }).catch(() => {
        navigate("/jobs");
      });
    }).finally(() => {
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner-enhanced mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner-enhanced mx-auto mb-4"></div>
        <p className="text-white">Loading...</p>
      </div>
    </div>
  );
}
