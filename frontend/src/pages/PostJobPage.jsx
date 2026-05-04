import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const DOMAINS = [
  "Web Development", "Mobile Development", "UI/UX Design", "Data Science",
  "Machine Learning", "DevOps", "Cloud Engineering", "Cybersecurity",
  "Blockchain", "Game Development", "Content Writing", "Digital Marketing",
  "Video Editing", "Graphic Design", "SEO", "Other"
];

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD"];

export default function PostJobPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", domain: "", requirements: "",
    salary: "", currency: "USD", company_name: "",
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.description || !form.domain || !form.salary) {
      setError("Title, description, domain, and salary are required.");
      return;
    }
    if (isNaN(form.salary) || Number(form.salary) < 0) {
      setError("Please enter a valid salary amount.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/jobs", { ...form, salary: Number(form.salary) });
      navigate("/my-postings");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.badge}>Client</span>
          <h1 style={s.title}>Post a Job</h1>
          <p style={s.sub}>Attract the right freelancers with a detailed listing</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Job Title</label>
            <input className="form-input" name="title" placeholder="e.g. Senior React Developer"
              value={form.title} onChange={handle} required />
          </div>

          <div className="form-group">
            <label className="form-label">Company / Your Name</label>
            <input className="form-input" name="company_name" placeholder="Your company or personal name"
              value={form.company_name} onChange={handle} />
          </div>

          <div className="form-group">
            <label className="form-label">Domain</label>
            <select className="form-input form-select" name="domain" value={form.domain} onChange={handle} required>
              <option value="">Select a domain...</option>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Job Description</label>
            <textarea className="form-input form-textarea" name="description"
              placeholder="Describe the role, responsibilities, and what success looks like..."
              value={form.description} onChange={handle} required style={{ minHeight: "150px" }} />
          </div>

          <div className="form-group">
            <label className="form-label">Requirements (optional)</label>
            <textarea className="form-input form-textarea" name="requirements"
              placeholder="List specific skills, experience, or qualifications needed..."
              value={form.requirements} onChange={handle} />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Budget / Salary</label>
              <input className="form-input" name="salary" type="number" min="0" placeholder="e.g. 5000"
                value={form.salary} onChange={handle} required />
            </div>
            <div className="form-group" style={{ width: "120px" }}>
              <label className="form-label">Currency</label>
              <select className="form-input form-select" name="currency" value={form.currency} onChange={handle}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {loading ? "Posting..." : "Post Job →"}
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "calc(100vh - 64px)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "40px 24px",
  },
  card: {
    width: "100%", maxWidth: "580px",
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "16px", padding: "40px",
  },
  header: { marginBottom: "32px" },
  badge: {
    display: "inline-block", padding: "4px 12px",
    background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.2)",
    borderRadius: "100px", fontSize: "0.78rem", fontWeight: 600, color: "#f0a500", marginBottom: "12px",
  },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" },
  sub: { color: "#8fa3bf", fontSize: "0.9rem" },
};
