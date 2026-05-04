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

export default function PostServicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", domain: "",
    cost: "", currency: "USD", delivery_days: "7", freelancer_name: "",
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.description || !form.domain || !form.cost) {
      setError("Title, description, domain, and cost are required.");
      return;
    }
    if (isNaN(form.cost) || Number(form.cost) < 0) {
      setError("Please enter a valid cost.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/services", {
        ...form,
        cost: Number(form.cost),
        delivery_days: Number(form.delivery_days),
      });
      navigate("/my-postings");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.badge}>Freelancer</span>
          <h1 style={s.title}>Offer a Service</h1>
          <p style={s.sub}>Showcase your skills and let clients come to you</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Service Title</label>
            <input className="form-input" name="title" placeholder="e.g. I will build a full-stack React app"
              value={form.title} onChange={handle} required />
          </div>

          <div className="form-group">
            <label className="form-label">Your Display Name</label>
            <input className="form-input" name="freelancer_name" placeholder="Your name as seen by clients"
              value={form.freelancer_name} onChange={handle} />
          </div>

          <div className="form-group">
            <label className="form-label">Domain</label>
            <select className="form-input form-select" name="domain" value={form.domain} onChange={handle} required>
              <option value="">Select a domain...</option>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Service Description</label>
            <textarea className="form-input form-textarea" name="description"
              placeholder="Describe what you offer, your process, and what the client will receive..."
              value={form.description} onChange={handle} required style={{ minHeight: "150px" }} />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Starting Price</label>
              <input className="form-input" name="cost" type="number" min="0" placeholder="e.g. 500"
                value={form.cost} onChange={handle} required />
            </div>
            <div className="form-group" style={{ width: "120px" }}>
              <label className="form-label">Currency</label>
              <select className="form-input form-select" name="currency" value={form.currency} onChange={handle}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Delivery Time (days)</label>
            <input className="form-input" name="delivery_days" type="number" min="1" max="365"
              value={form.delivery_days} onChange={handle} required />
            <span className="form-hint">How many days to deliver the completed service?</span>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="submit" className="btn btn-teal btn-lg" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {loading ? "Posting..." : "Post Service →"}
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
    background: "rgba(0,201,167,0.1)", border: "1px solid rgba(0,201,167,0.2)",
    borderRadius: "100px", fontSize: "0.78rem", fontWeight: 600, color: "#00c9a7", marginBottom: "12px",
  },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" },
  sub: { color: "#8fa3bf", fontSize: "0.9rem" },
};
