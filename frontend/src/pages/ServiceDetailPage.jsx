import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestMsg, setRequestMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });
  const [clientProfile, setClientProfile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [svcRes, profileRes] = await Promise.allSettled([
          api.get(`/api/services/${id}`),
          api.get("/api/users/client/profile"),
        ]);
        if (svcRes.status === "fulfilled") setSvc(svcRes.value.data);
        if (profileRes.status === "fulfilled") setClientProfile(profileRes.value.data);
      } catch (e) {}
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const sendRequest = async () => {
    setRequesting(true);
    try {
      await api.post("/api/chat/requests", {
        receiver_id: svc.freelancer_id,
        receiver_email: svc.freelancer_email,
        context_type: "service",
        context_id: svc.id,
        context_title: svc.title,
        message: requestMsg,
        sender_name: clientProfile?.company_name || user.email,
      });
      setFeedback({ type: "success", msg: "Connect request sent! The freelancer will review it shortly." });
      setShowForm(false);
    } catch (err) {
      setFeedback({ type: "error", msg: err.response?.data?.error || "Failed to send request" });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!svc) return <div className="page"><div className="container"><div className="empty-state"><h3>Service not found</h3></div></div></div>;

  const fmtCost = (n, c) => new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        <button onClick={() => navigate(-1)} style={s.back}>← Back to Services</button>

        <div className="card" style={s.mainCard}>
          <div style={s.header}>
            <div style={{ flex: 1 }}>
              <span className="badge badge-amber">{svc.domain}</span>
              <h1 style={s.title}>{svc.title}</h1>
              <div style={s.freelancerRow}>
                <div style={s.avatar}>{svc.freelancer_name?.[0]?.toUpperCase() || "?"}</div>
                <div>
                  <p style={s.freelancerName}>{svc.freelancer_name || "Freelancer"}</p>
                  <p style={s.freelancerEmail}>{svc.freelancer_email}</p>
                </div>
              </div>
            </div>
            <div style={s.costBlock}>
              <span style={s.costLabel}>Starting at</span>
              <span style={s.cost}>{fmtCost(svc.cost, svc.currency)}</span>
              <span style={s.delivery}>🕐 {svc.delivery_days} day{svc.delivery_days !== 1 ? "s" : ""} delivery</span>
            </div>
          </div>

          <div className="divider" />

          <section style={s.section}>
            <h2 style={s.sectionTitle}>About This Service</h2>
            <p style={s.body}>{svc.description}</p>
          </section>

          <div style={s.meta}>
            <span style={s.metaItem}>📅 Posted {new Date(svc.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span className={`badge ${svc.is_active ? "badge-success" : "badge-gray"}`}>{svc.is_active ? "Available" : "Unavailable"}</span>
          </div>
        </div>

        {user.role === "client" && svc.is_active && (
          <div className="card" style={{ marginTop: "20px" }}>
            <h2 style={s.sectionTitle}>Want to hire for this service?</h2>
            <p style={{ fontSize: "0.9rem", color: "#8fa3bf", marginBottom: "16px" }}>
              Send a connect request to the freelancer. Once accepted, chat directly to discuss your project.
            </p>
            {feedback.msg && <div className={`alert alert-${feedback.type}`}>{feedback.msg}</div>}
            {!feedback.msg && (
              showForm ? (
                <div>
                  <div className="form-group">
                    <label className="form-label">Message (optional)</label>
                    <textarea className="form-input form-textarea" placeholder="Describe your project and what you need from this freelancer..."
                      value={requestMsg} onChange={e => setRequestMsg(e.target.value)} rows={4} />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-primary btn-lg" onClick={sendRequest} disabled={requesting}>
                      {requesting ? "Sending..." : "Send Request"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
                  Connect with Freelancer →
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
  title: { fontFamily: "'Syne', sans-serif", fontSize: "1.8rem", fontWeight: 800, margin: "10px 0 14px" },
  freelancerRow: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: "44px",
    height: "44px",
    background: "linear-gradient(135deg, #f0a500, #c98900)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "1.2rem",
    color: "#0a0e14",
    flexShrink: 0,
  },
  freelancerName: { fontWeight: 600, fontSize: "0.92rem" },
  freelancerEmail: { fontSize: "0.8rem", color: "#5a7a9e" },
  costBlock: { textAlign: "right", flexShrink: 0 },
  costLabel: { display: "block", fontSize: "0.75rem", color: "#5a7a9e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" },
  cost: { display: "block", fontFamily: "'Syne', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#f0a500" },
  delivery: { display: "block", fontSize: "0.8rem", color: "#5a7a9e", marginTop: "4px" },
  section: { marginBottom: "24px" },
  sectionTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700, marginBottom: "10px" },
  body: { fontSize: "0.95rem", color: "#8fa3bf", lineHeight: 1.75, whiteSpace: "pre-wrap" },
  meta: { display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" },
  metaItem: { fontSize: "0.82rem", color: "#3a5570" },
};
