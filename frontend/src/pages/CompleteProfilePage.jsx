import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const SKILL_SUGGESTIONS = [
  "React", "Vue.js", "Angular", "Node.js", "Python", "Django", "Flask",
  "TypeScript", "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "AWS",
  "GraphQL", "UI/UX Design", "Figma", "Machine Learning", "Data Science",
  "Go", "Rust", "Swift", "Kotlin", "DevOps", "Cybersecurity",
];

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Freelancer state
  const [fData, setFData] = useState({ full_name: "", description: "", skills: [] });
  const [skillInput, setSkillInput] = useState("");

  // Client state
  const [cData, setCData] = useState({ company_name: "", description: "", website: "" });

  const addSkill = (skill) => {
    const s = skill.trim();
    if (s && !fData.skills.includes(s) && fData.skills.length < 20) {
      setFData({ ...fData, skills: [...fData.skills, s] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => setFData({ ...fData, skills: fData.skills.filter(s => s !== skill) });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (user.role === "freelancer") {
        if (!fData.full_name || !fData.description || fData.skills.length === 0) {
          setError("Please fill in all fields and add at least one skill.");
          return;
        }
        await api.post("/api/users/freelancer/profile", fData);
      } else {
        if (!cData.company_name || !cData.description) {
          setError("Company name and description are required.");
          return;
        }
        await api.post("/api/users/client/profile", cData);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.step}>Step 2 of 2</span>
          <h1 style={s.title}>Complete your profile</h1>
          <p style={s.sub}>
            {user?.role === "freelancer"
              ? "Tell clients who you are and what you do best"
              : "Tell freelancers about your company and projects"}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          {user?.role === "freelancer" ? (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Your full name"
                  value={fData.full_name} onChange={e => setFData({ ...fData, full_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">About You</label>
                <textarea className="form-input form-textarea" placeholder="Describe your experience, what you specialise in, your working style..."
                  value={fData.description} onChange={e => setFData({ ...fData, description: e.target.value })} required />
                <span className="form-hint">Minimum 50 characters. Be specific and compelling.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Skills</label>
                <div style={s.skillInput}>
                  <input className="form-input" placeholder="Add a skill & press Enter" value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }} />
                  <button type="button" className="btn btn-teal btn-sm" onClick={() => addSkill(skillInput)}>Add</button>
                </div>
                {fData.skills.length > 0 && (
                  <div style={s.skillList}>
                    {fData.skills.map(sk => (
                      <span key={sk} className="skill-tag" style={{ cursor: "pointer" }} onClick={() => removeSkill(sk)}>
                        {sk} ×
                      </span>
                    ))}
                  </div>
                )}
                <div style={s.suggestions}>
                  {SKILL_SUGGESTIONS.filter(s => !fData.skills.includes(s)).slice(0, 8).map(sk => (
                    <span key={sk} onClick={() => addSkill(sk)} style={s.suggestion}>{sk}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Company / Name</label>
                <input className="form-input" placeholder="Your company or organisation name"
                  value={cData.company_name} onChange={e => setCData({ ...cData, company_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">About Your Business</label>
                <textarea className="form-input form-textarea" placeholder="Describe your company, the type of work you hire for, and what makes working with you great..."
                  value={cData.description} onChange={e => setCData({ ...cData, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Website (optional)</label>
                <input className="form-input" type="url" placeholder="https://yourcompany.com"
                  value={cData.website} onChange={e => setCData({ ...cData, website: e.target.value })} />
              </div>
            </>
          )}
          <button type="submit" className="btn btn-teal btn-lg" disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Saving..." : "Complete Profile →"}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 24px",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "40px",
  },
  header: { marginBottom: "32px" },
  step: {
    display: "inline-block",
    padding: "4px 12px",
    background: "rgba(240,165,0,0.1)",
    border: "1px solid rgba(240,165,0,0.2)",
    borderRadius: "100px",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#f0a500",
    marginBottom: "12px",
  },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" },
  sub: { color: "#8fa3bf", fontSize: "0.9rem" },
  skillInput: { display: "flex", gap: "8px" },
  skillList: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" },
  suggestions: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" },
  suggestion: {
    padding: "4px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #253348",
    borderRadius: "100px",
    fontSize: "0.78rem",
    color: "#5a7a9e",
    cursor: "pointer",
  },
};
