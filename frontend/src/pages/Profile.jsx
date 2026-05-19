import { useState, useEffect } from "react";
import api, { getAssetUrl } from "../utils/api";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("basic"); // basic, education, experience, projects, extras
  
  const [formData, setFormData] = useState({
    name: "", phone: "", location: "", bio: "", 
    hard_skills: [],
    soft_skills: [],
    social_links: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    achievements: [],
    custom_sections: []
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      const data = res.data;

      // Handle skills (Normalization for categorized skills)
      let hard_skills = Array.isArray(data.hard_skills) ? data.hard_skills : [];
      let soft_skills = Array.isArray(data.soft_skills) ? data.soft_skills : [];
      
      // Migration for old data
      if (hard_skills.length === 0 && soft_skills.length === 0 && data.skills) {
        if (Array.isArray(data.skills)) hard_skills = data.skills;
        else if (typeof data.skills === 'string') hard_skills = data.skills.split(',').map(s => s.trim());
      }

      // Handle social links (Normalization for legacy or corrupted data)
      let social_links = [];
      if (Array.isArray(data.social_links)) {
        social_links = data.social_links.map(l => {
          if (typeof l === 'string') return { platform: 'Link', url: l };
          return { platform: l.platform || 'Link', url: l.url || '' };
        });
      } else if (typeof data.social_links === 'object' && data.social_links !== null) {
        social_links = Object.entries(data.social_links)
          .filter(([_, url]) => url)
          .map(([platform, url]) => ({ platform: platform.charAt(0).toUpperCase() + platform.slice(1), url }));
      } else if (typeof data.social_links === 'string' && data.social_links) {
        try {
          const parsed = JSON.parse(data.social_links);
          if (Array.isArray(parsed)) {
            social_links = parsed.map(l => (typeof l === 'string' ? { platform: 'Link', url: l } : l));
          } else if (typeof parsed === 'object') {
            social_links = Object.entries(parsed).map(([platform, url]) => ({ platform, url }));
          }
        } catch (e) { 
          social_links = [{ platform: 'Link', url: data.social_links }];
        }
      }

      const userData = {
        ...data,
        hard_skills,
        soft_skills,
        social_links,
        education: data.education || [],
        experience: data.experience || [],
        projects: data.projects || [],
        certifications: data.certifications || [],
        achievements: data.achievements || [],
        custom_sections: data.custom_sections || []
      };

      setUser(userData);
      setFormData(userData);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/profile", formData);
      setUser({ ...user, ...formData });
      setEditing(false);
      // Optional: success message
    } catch (error) {
      alert("Error updating profile");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imgFormData = new FormData();
    imgFormData.append("image", file);

    try {
      const res = await api.post("/auth/profile/image", imgFormData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUser({ ...user, profile_image: res.data.imagePath });
    } catch (error) {
      alert("Error uploading image");
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Helper functions for array fields
  const addArrayItem = (field, defaultValue) => {
    setFormData({ ...formData, [field]: [...formData[field], defaultValue] });
  };

  const updateArrayItem = (field, index, value) => {
    const newList = [...formData[field]];
    newList[index] = { ...newList[index], ...value };
    setFormData({ ...formData, [field]: newList });
  };

  const removeArrayItem = (field, index) => {
    const newList = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newList });
  };

  const handleSkillAdd = (field, e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== "") {
      e.preventDefault();
      if (!formData[field].includes(e.target.value.trim())) {
        setFormData({ ...formData, [field]: [...formData[field], e.target.value.trim()] });
      }
      e.target.value = "";
    }
  };

  const removeSkill = (field, skillToRemove) => {
    setFormData({ ...formData, [field]: formData[field].filter(s => s !== skillToRemove) });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const TabButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all ${activeTab === id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              {editing ? "Customize Your Profile" : "Professional Profile"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
              {editing ? "Add your details to stand out to employers." : "Keep your profile updated to get better opportunities."}
            </p>
          </div>
          <div className="flex gap-3">
            {!editing ? (
              <button 
                onClick={() => setEditing(true)} 
                className="group px-6 py-3 bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50 hover:bg-purple-600 hover:text-white font-bold flex items-center gap-2 rounded-2xl shadow-sm transition-all"
              >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={handleUpdate}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/25 transition-all active:scale-95"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => { setEditing(false); setFormData(user); }} 
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Discard
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar - Personal Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 z-0"></div>
              
              <div className="relative z-10 text-center">
                <div className="group/avatar relative w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mx-auto mb-6 p-1.5 shadow-2xl transition-transform hover:scale-105">
                  <div className="w-full h-full bg-white dark:bg-gray-900 rounded-full flex items-center justify-center overflow-hidden relative">
                    {user.profile_image ? (
                      <img src={getAssetUrl(user.profile_image)} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl font-black bg-gradient-to-br from-purple-500 to-blue-600 bg-clip-text text-transparent">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    )}

                    <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                      <svg className="w-8 h-8 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="text-[10px] text-white font-bold uppercase tracking-widest">Update</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{user.name || "Anonymous User"}</h2>
                <div className="inline-flex items-center px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-black uppercase tracking-widest mb-8">
                  {user.role === 'hr' ? 'Talent Specialist' : 'Career Seeker'}
                </div>

                <div className="space-y-4 text-left border-t border-gray-50 dark:border-gray-800 pt-8">
                  <div className="flex items-center group/item cursor-default">
                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mr-4 transition-colors group-hover/item:bg-purple-50 dark:group-hover/item:bg-purple-900/30">
                      <svg className="w-5 h-5 text-gray-400 group-hover/item:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center group/item cursor-default">
                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mr-4 transition-colors group-hover/item:bg-blue-50 dark:group-hover/item:bg-blue-900/30">
                      <svg className="w-5 h-5 text-gray-400 group-hover/item:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{user.phone || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center group/item cursor-default">
                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mr-4 transition-colors group-hover/item:bg-pink-50 dark:group-hover/item:bg-pink-900/30">
                      <svg className="w-5 h-5 text-gray-400 group-hover/item:text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Location</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{user.location || "Earth"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button onClick={() => navigate("/jobs")} className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-purple-500/20">Find Jobs</button>
                  <button onClick={() => navigate(user.role === 'hr' ? '/hr-dashboard' : '/user-dashboard')} className="py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all">Dashboard</button>
                </div>
              </div>
            </div>

            {/* Social Links Card */}
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Digital Presence</h3>
                {editing && (
                  <button 
                    onClick={() => addArrayItem('social_links', { platform: "", url: "" })}
                    className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(editing ? formData.social_links : user.social_links).map((link, i) => (
                  <div key={i} className="group relative">
                    {editing ? (
                      <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                        <input 
                          placeholder="Platform" 
                          value={link.platform} 
                          onChange={(e) => updateArrayItem('social_links', i, { platform: e.target.value })}
                          className="w-1/3 bg-transparent text-xs font-bold outline-none border-r border-gray-200 dark:border-gray-700 pr-2"
                        />
                        <input 
                          placeholder="URL" 
                          value={link.url} 
                          onChange={(e) => updateArrayItem('social_links', i, { url: e.target.value })}
                          className="flex-1 bg-transparent text-xs outline-none"
                        />
                        <button onClick={() => removeArrayItem('social_links', i)} className="text-red-500 hover:text-red-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <a 
                        href={(link.url || "").startsWith('http') ? link.url : `https://${link.url || ""}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 hover:shadow-md transition-all group/link"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-black text-xs mr-3 group-hover/link:bg-blue-600 group-hover/link:text-white transition-all">
                          {link.platform ? link.platform.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{link.platform || 'Link'}</p>
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate">{(link.url || "").replace(/^https?:\/\//i, '')}</p>
                        </div>
                        <svg className="w-3 h-3 text-gray-300 group-hover/link:text-blue-500 transform transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </a>
                    )}
                  </div>
                ))}
                {(editing ? formData.social_links : user.social_links).length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-4">No social links added.</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Tabs for Navigation */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <TabButton id="basic" label="Background" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
              <TabButton id="education" label="Education" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>} />
              <TabButton id="experience" label="Experience" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
              <TabButton id="projects" label="Projects" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
              <TabButton id="extras" label="Extras" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>} />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 min-h-[500px]">
              
              {/* TAB: BASIC INFO */}
              {activeTab === 'basic' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Background Summary</h3>
                  </div>

                  {editing ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Full Legal Name</label>
                          <input 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-bold" 
                            required 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Contact Number</label>
                          <input 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-bold" 
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Professional Location</label>
                          <input 
                            name="location" 
                            value={formData.location} 
                            onChange={handleChange} 
                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-bold" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Short Introduction / Bio</label>
                        <textarea 
                          name="bio" 
                          value={formData.bio} 
                          onChange={handleChange} 
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all h-40 resize-none font-medium leading-relaxed" 
                          placeholder="Briefly describe your career journey and aspirations..." 
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Hard Skills (Technical)</label>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem]">
                            <div className="flex flex-wrap gap-2 mb-3">
                              {formData.hard_skills.map((skill, index) => (
                                <span key={index} className="pl-3 pr-2 py-1.5 bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                                  {skill}
                                  <button onClick={() => removeSkill('hard_skills', skill)} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input 
                              placeholder="Add hard skill..." 
                              onKeyDown={(e) => handleSkillAdd('hard_skills', e)}
                              className="w-full bg-transparent text-sm outline-none font-bold placeholder:text-gray-400"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Soft Skills (Interpersonal)</label>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem]">
                            <div className="flex flex-wrap gap-2 mb-3">
                              {formData.soft_skills.map((skill, index) => (
                                <span key={index} className="pl-3 pr-2 py-1.5 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                                  {skill}
                                  <button onClick={() => removeSkill('soft_skills', skill)} className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-md transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input 
                              placeholder="Add soft skill..." 
                              onKeyDown={(e) => handleSkillAdd('soft_skills', e)}
                              className="w-full bg-transparent text-sm outline-none font-bold placeholder:text-gray-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">About Me</p>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-6 opacity-10">
                             <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 2H12.017V3V6C12.017 8.20914 13.8079 10 16.017 10H18.017V14H16.017C13.8079 14 12.017 15.7909 12.017 18V21H14.017ZM6.017 21L6.017 18C6.017 16.8954 6.91243 16 8.017 16H11.017C11.5693 16 12.017 15.5523 12.017 15V9C12.017 8.44772 11.5693 8 11.017 8H8.017C6.91243 8 6.017 7.10457 6.017 6V3L6.017 2H4.017V3V6C4.017 8.20914 5.80786 10 8.017 10H10.017V14H8.017C5.80786 14 4.017 15.7909 4.017 18V21H6.017Z" /></svg>
                           </div>
                           <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-semibold italic">
                             {user.bio || "No biography shared yet. Introduce yourself to the world!"}
                           </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Hard Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {user.hard_skills?.length > 0 ? user.hard_skills.map((skill, index) => (
                              <div key={index} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl text-[11px] font-black text-blue-600 dark:text-blue-400 shadow-sm hover:shadow-md transition-all">
                                {skill}
                              </div>
                            )) : <p className="text-xs text-gray-400 italic">No hard skills listed.</p>}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Soft Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {user.soft_skills?.length > 0 ? user.soft_skills.map((skill, index) => (
                              <div key={index} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl text-[11px] font-black text-emerald-600 dark:text-emerald-400 shadow-sm hover:shadow-md transition-all">
                                {skill}
                              </div>
                            )) : <p className="text-xs text-gray-400 italic">No soft skills listed.</p>}
                          </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* TAB: EDUCATION */}
              {activeTab === 'education' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">Academic Credentials</h3>
                    </div>
                    {editing && (
                      <button 
                        onClick={() => addArrayItem('education', { institution: "", degree: "", board: "", marks: "", year: "" })}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20"
                      >
                        Add School
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {(editing ? formData.education : user.education).map((edu, i) => (
                      <div key={i} className="group relative bg-gray-50 dark:bg-gray-800/40 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 transition-all hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-blue-500/5">
                        {editing ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input placeholder="Institution (e.g. Stanford University)" value={edu.institution} onChange={(e) => updateArrayItem('education', i, { institution: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm font-bold" />
                            <input placeholder="Degree (e.g. B.Tech Computer Science)" value={edu.degree} onChange={(e) => updateArrayItem('education', i, { degree: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm font-bold" />
                            <input placeholder="Board / University" value={edu.board} onChange={(e) => updateArrayItem('education', i, { board: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm" />
                            <div className="flex gap-2">
                              <input placeholder="Marks / CGPA" value={edu.marks} onChange={(e) => updateArrayItem('education', i, { marks: e.target.value })} className="w-2/3 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm" />
                              <input placeholder="Year" value={edu.year} onChange={(e) => updateArrayItem('education', i, { year: e.target.value })} className="w-1/3 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm" />
                            </div>
                            <button onClick={() => removeArrayItem('education', i)} className="md:col-span-2 py-2 text-rose-500 font-bold text-[10px] uppercase tracking-widest border border-rose-100 dark:border-rose-900/30 rounded-xl hover:bg-rose-500 hover:text-white transition-all">Remove Entry</button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-6">
                            <div className="w-14 h-14 shrink-0 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm text-blue-500 font-black text-xl">
                              {edu.institution ? edu.institution.charAt(0) : 'E'}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-lg font-black text-gray-900 dark:text-white">{edu.institution || "Institution Name"}</h4>
                                  <p className="text-blue-600 dark:text-blue-400 font-bold">{edu.degree || "Degree Detail"}</p>
                                </div>
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-900 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg">{edu.year || "N/A"}</span>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-4">
                                <div className="flex items-center text-xs text-gray-500 font-medium">
                                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                  {edu.board || "Not specified"}
                                </div>
                                <div className="flex items-center text-xs text-emerald-600 font-black">
                                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4" /></svg>
                                  Score: {edu.marks || "N/A"}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {(editing ? formData.education : user.education).length === 0 && (
                      <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                         <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                           <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /></svg>
                         </div>
                         <p className="text-gray-400 font-bold">No education history added yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: EXPERIENCE */}
              {activeTab === 'experience' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">Professional Journey</h3>
                    </div>
                    {editing && (
                      <button 
                        onClick={() => addArrayItem('experience', { company: "", position: "", duration: "", description: "" })}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Add Position
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {(editing ? formData.experience : user.experience).map((exp, i) => (
                      <div key={i} className="group relative bg-gray-50 dark:bg-gray-800/40 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 transition-all hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-emerald-500/5">
                        {editing ? (
                          <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                              <input placeholder="Company Name" value={exp.company} onChange={(e) => updateArrayItem('experience', i, { company: e.target.value })} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm font-bold" />
                              <input placeholder="Position / Title" value={exp.position} onChange={(e) => updateArrayItem('experience', i, { position: e.target.value })} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm font-bold" />
                            </div>
                            <input placeholder="Duration (e.g. Jan 2020 - Present)" value={exp.duration} onChange={(e) => updateArrayItem('experience', i, { duration: e.target.value })} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm" />
                            <textarea placeholder="Job Responsibilities & Impact" value={exp.description} onChange={(e) => updateArrayItem('experience', i, { description: e.target.value })} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm h-24 resize-none" />
                            <button onClick={() => removeArrayItem('experience', i)} className="py-2 text-rose-500 font-bold text-[10px] uppercase tracking-widest border border-rose-100 dark:border-rose-900/30 rounded-xl hover:bg-rose-500 hover:text-white transition-all">Remove Entry</button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-6">
                            <div className="w-14 h-14 shrink-0 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm text-emerald-500 font-black text-xl">
                              {exp.company ? exp.company.charAt(0) : 'W'}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-lg font-black text-gray-900 dark:text-white">{exp.company || "Company Name"}</h4>
                                  <p className="text-emerald-600 dark:text-emerald-400 font-bold">{exp.position || "Role Title"}</p>
                                </div>
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-900 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg">{exp.duration || "N/A"}</span>
                              </div>
                              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                {exp.description || "Describe your role and achievements..."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {(editing ? formData.experience : user.experience).length === 0 && (
                      <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                         <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                           <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                         </div>
                         <p className="text-gray-400 font-bold">No work experience listed.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: PROJECTS */}
              {activeTab === 'projects' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-2xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">Portfolio & Projects</h3>
                    </div>
                    {editing && (
                      <button 
                        onClick={() => addArrayItem('projects', { title: "", description: "", technologies: [], link: "" })}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-pink-500/20"
                      >
                        New Project
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(editing ? formData.projects : user.projects).map((proj, i) => (
                      <div key={i} className="group relative bg-gray-50 dark:bg-gray-800/40 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 transition-all hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-pink-500/5 flex flex-col">
                        {editing ? (
                          <div className="space-y-4">
                            <input placeholder="Project Title" value={proj.title} onChange={(e) => updateArrayItem('projects', i, { title: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm font-bold" />
                            <textarea placeholder="Description" value={proj.description} onChange={(e) => updateArrayItem('projects', i, { description: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm h-24 resize-none" />
                            <input 
                              placeholder="Technologies (comma separated)" 
                              value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies} 
                              onChange={(e) => updateArrayItem('projects', i, { technologies: e.target.value.split(',').map(t => t.trim()) })} 
                              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm" 
                            />
                            <input placeholder="Project Link" value={proj.link} onChange={(e) => updateArrayItem('projects', i, { link: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm" />
                            <button onClick={() => removeArrayItem('projects', i)} className="w-full py-2 text-rose-500 font-bold text-[10px] uppercase tracking-widest border border-rose-100 dark:border-rose-900/30 rounded-xl hover:bg-rose-500 hover:text-white transition-all">Remove</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-pink-50 dark:bg-pink-900/30 text-pink-500 rounded-2xl flex items-center justify-center font-black">
                                {proj.title ? proj.title.charAt(0) : 'P'}
                              </div>
                              {proj.link && (
                                <a href={proj.link} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-xl transition-all">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                            </div>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">{proj.title || "Untitled Project"}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium line-clamp-3 mb-6 flex-1">
                              {proj.description || "No project description provided."}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {proj.technologies && proj.technologies.map((tech, ti) => (
                                <span key={ti} className="px-3 py-1 bg-gray-100 dark:bg-gray-900 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {(editing ? formData.projects : user.projects).length === 0 && (
                      <div className="md:col-span-2 text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                         <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                           <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                         </div>
                         <p className="text-gray-400 font-bold">Showcase your best work here.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: EXTRAS */}
              {activeTab === 'extras' && (
                <div className="space-y-12 animate-fadeIn">
                  
                  {/* Certifications */}
                  <section>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Professional Certifications</h4>
                      {editing && <button onClick={() => addArrayItem('certifications', { title: "", organization: "", year: "", link: "" })} className="text-xs font-bold text-blue-600 hover:underline">+ Add New</button>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(editing ? formData.certifications : user.certifications).map((cert, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                          {editing ? (
                            <div className="space-y-3">
                              <input placeholder="Certification Title" value={cert.title} onChange={(e) => updateArrayItem('certifications', i, { title: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-xs font-bold" />
                              <input placeholder="Issuing Organization" value={cert.organization} onChange={(e) => updateArrayItem('certifications', i, { organization: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-xs" />
                              <div className="flex gap-2">
                                <input placeholder="Year" value={cert.year} onChange={(e) => updateArrayItem('certifications', i, { year: e.target.value })} className="w-1/3 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-xs" />
                                <input placeholder="Link" value={cert.link} onChange={(e) => updateArrayItem('certifications', i, { link: e.target.value })} className="w-2/3 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-xs" />
                              </div>
                              <button onClick={() => removeArrayItem('certifications', i)} className="w-full text-xs text-rose-500 font-bold">Remove</button>
                            </div>
                          ) : (
                            <div className="flex gap-4 items-center">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                              </div>
                              <div>
                                <h5 className="text-sm font-black text-gray-900 dark:text-white leading-tight">{cert.title || "Certification"}</h5>
                                <p className="text-[10px] font-bold text-gray-500">{cert.organization} • {cert.year}</p>
                                {cert.link && (
                                  <a 
                                    href={(cert.link || "").startsWith('http') ? cert.link : `https://${cert.link || ""}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[10px] text-blue-500 hover:underline font-bold mt-1 inline-block"
                                  >
                                    View Credential
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Achievements */}
                  <section>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Key Achievements</h4>
                      {editing && <button onClick={() => addArrayItem('achievements', { title: "", description: "" })} className="text-xs font-bold text-blue-600 hover:underline">+ Add New</button>}
                    </div>
                    <div className="space-y-4">
                      {(editing ? formData.achievements : user.achievements).map((ach, i) => (
                        <div key={i} className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-900/20">
                          {editing ? (
                            <div className="space-y-3">
                              <input placeholder="Achievement Title" value={ach.title} onChange={(e) => updateArrayItem('achievements', i, { title: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-xs font-bold" />
                              <textarea placeholder="Brief details" value={ach.description} onChange={(e) => updateArrayItem('achievements', i, { description: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-xs h-20 resize-none" />
                              <button onClick={() => removeArrayItem('achievements', i)} className="text-xs text-rose-500 font-bold">Remove</button>
                            </div>
                          ) : (
                            <div className="flex gap-5">
                              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6.15 4.47 2.35 7.33-6.2-4.52-6.2 4.52 2.35-7.33-6.15-4.47h7.6z" /></svg>
                              </div>
                              <div>
                                <h5 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{ach.title || "Big Achievement"}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">{ach.description}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Custom Sections */}
                  <section>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Additional Information</h4>
                      {editing && <button onClick={() => addArrayItem('custom_sections', { title: "", content: "" })} className="text-xs font-bold text-blue-600 hover:underline">+ Add Custom Section</button>}
                    </div>
                    <div className="space-y-6">
                      {(editing ? formData.custom_sections : user.custom_sections).map((sec, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                          {editing ? (
                            <div className="space-y-4">
                              <input placeholder="Section Title (e.g. Languages, Hobbies)" value={sec.title} onChange={(e) => updateArrayItem('custom_sections', i, { title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm font-black" />
                              <textarea placeholder="Section Content" value={sec.content} onChange={(e) => updateArrayItem('custom_sections', i, { content: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm h-32 resize-none" />
                              <button onClick={() => removeArrayItem('custom_sections', i)} className="text-xs text-rose-500 font-bold">Remove Section</button>
                            </div>
                          ) : (
                            <div>
                              <h5 className="text-xl font-black text-gray-900 dark:text-white mb-4 border-b border-gray-50 dark:border-gray-800 pb-3 inline-block pr-10">{sec.title || "Custom Section"}</h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{sec.content}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
