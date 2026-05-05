import axios from "axios";

export default axios.create({
  baseURL: "https://newmern-smart-job-tracker.vercel.app/api"
});