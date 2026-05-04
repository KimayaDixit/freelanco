import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const [jobRes, profileRes] = await Promise.allSettled([
          api.get(`/api/jobs/${id}`),
          api.get("/api/users/freelancer/profile"),
        ]);
        if (jobRes.status === "fulfilled") setJob(jobRes.value.data);
        if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
      } catch (e) {}
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const sendRequest = async () => {
    setRequesting(true);
    try {
      await api.post("/api/chat/requests", {
        receiver_id: job.client_id,
        receiver_email: job.client_email,
        context_type: "job",
        context_id: job.id,
        context_title: job.title,
        message: requestMsg,
        sender_name: profile?.full_name || user.email,
      });
      setFeedback({ type: "success", msg: "Connect request sent! Wait for the client to accept." });
      setShowForm(false);
    } catch (err) {
      setFeedback({ type: "error", msg: err.response?.data?.error || "Failed to send request" });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!job) return <div className="page"><div className="container"><div className="empty-state"><h3>Job not found</h3></div></div></div>;

  const fmtSalary = (n, c) => new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        <button onClick={() => navigate(-1)} style={s.back}>← Back to Jobs</button>

        <div className="card" style={s.mainCard}>
          <div style={s.header}>
            <div>
              <span className="badge badge-teal">{job.domain}</span>
              <h1 style={s.title}>{job.title}</h1>
              {job.company_name && <p style={s.company}>🏢 {job.company_name}</p>}
            </div>
            <div style={s.salaryBlock}>
              <span style={s.salaryLabel}>Budget</span>
              <span style={s.salary}>{fmtSalary(job.salary, job.currency)}</span>
            </div>
          </div>

          <div className="divider" />

          <section style={s.section}>
            <h2 style={s.sectionTitle}>Job Description</h2>
            <p style={s.body}>{job.description}</p>
          </section>

          {job.requirements && (
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Requirements</h2>
              <p style={s.body}>{job.requirements}</p>
            </section>
          )}

          <div style={s.meta}>
            <span style={s.metaItem}>📅 Posted {new Date(job.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span className={`badge ${job.is_active ? "badge-success" : "badge-gray"}`}>{job.is_active ? "Active" : "Closed"}</span>
          </div>
        </div>

        {/* Connect section */}
        {user.role === "freelancer" && job.is_active && (
          <div className="card" style={{ marginTop: "20px" }}>
            <h2 style={s.sectionTitle}>Interested in this job?</h2>
            <p style={{ fontSize: "0.9rem", color: "#8fa3bf", marginBottom: "16px" }}>
              Send a connect request to the client. If they accept, you'll be able to chat directly.
            </p>
            {feedback.msg && (
              <div className={`alert alert-${feedback.type}`}>{feedback.msg}</div>
            )}
            {!feedback.msg && (
              showForm ? (
                <div>
                  <div className="form-group">
                    <label className="form-label">Message (optional)</label>
                    <textarea className="form-input form-textarea" placeholder="Introduce yourself and explain why you're a great fit..."
                      value={requestMsg} onChange={e => setRequestMsg(e.target.value)} rows={4} />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-teal" onClick={sendRequest} disabled={requesting}>
                      {requesting ? "Sending..." : "Send Request"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
                  Connect with Client →
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  back: { background: "none", border: "none", color: "#5a7a9e", cursor: "pointer", fontSize: "0.88rem", marginBottom: "20px", padding: "0" },
  mainCard: { cursor: "default" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "1.8rem", fontWeight: 800, margin: "10px 0 6px" },
  company: { color: "#5a7a9e", fontSize: "0.88rem" },
  salaryBlock: { textAlign: "right", flexShrink: 0 },
  salaryLabel: { display: "block", fontSize: "0.75rem", color: "#5a7a9e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" },
  salary: { fontFamily: "'Syne', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#f0a500" },
  section: { marginBottom: "24px" },
  sectionTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700, marginBottom: "10px" },
  body: { fontSize: "0.95rem", color: "#8fa3bf", lineHeight: 1.75, whiteSpace: "pre-wrap" },
  meta: { display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" },
  metaItem: { fontSize: "0.82rem", color: "#3a5570" },
};
