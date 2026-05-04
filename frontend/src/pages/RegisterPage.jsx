import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", role: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const selectRole = (role) => setForm({ ...form, role });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.role) { setError("Please select a role"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setLoading(true);
    try {
      await register(form.email, form.password, form.role);
      navigate("/complete-profile");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logo}>⬡</div>
          <h1 style={s.title}>Create your account</h1>
          <p style={s.sub}>Join the Nexus community today</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Role selector */}
        <div style={s.roleSection}>
          <p style={s.roleLabel}>I want to</p>
          <div style={s.roleGrid}>
            {[
              { role: "freelancer", icon: "💼", label: "Offer Services", desc: "Find clients & post my services" },
              { role: "client", icon: "🏢", label: "Hire Talent", desc: "Post jobs & find freelancers" },
            ].map(({ role, icon, label, desc }) => (
              <div key={role} onClick={() => selectRole(role)}
                style={{ ...s.roleCard, ...(form.role === role ? s.roleCardActive : {}) }}>
                <div style={s.roleIcon}>{icon}</div>
                <div style={s.roleCardLabel}>{label}</div>
                <div style={s.roleCardDesc}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" placeholder="Min. 6 characters"
              value={form.password} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input name="confirmPassword" type="password" className="form-input" placeholder="••••••••"
              value={form.confirmPassword} onChange={handle} required />
          </div>
          <button type="submit" className="btn btn-teal btn-lg" disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>
        <p style={s.footer}>
          Already have an account? <Link to="/login" style={s.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    background: "radial-gradient(ellipse at 50% 0%, rgba(0,201,167,0.04) 0%, transparent 60%)",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "40px",
  },
  header: { textAlign: "center", marginBottom: "28px" },
  logo: { fontSize: "2.5rem", color: "#00c9a7", marginBottom: "16px" },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "1.7rem", fontWeight: 800, marginBottom: "8px" },
  sub: { color: "#8fa3bf", fontSize: "0.9rem" },
  roleSection: { marginBottom: "28px" },
  roleLabel: { fontSize: "0.85rem", fontWeight: 600, color: "#5a7a9e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" },
  roleGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  roleCard: {
    padding: "18px 14px",
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s",
  },
  roleCardActive: {
    border: "1px solid #00c9a7",
    background: "rgba(0,201,167,0.06)",
    boxShadow: "0 0 0 1px rgba(0,201,167,0.2)",
  },
  roleIcon: { fontSize: "1.6rem", marginBottom: "8px" },
  roleCardLabel: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", marginBottom: "4px" },
  roleCardDesc: { fontSize: "0.78rem", color: "#5a7a9e" },
  footer: { textAlign: "center", marginTop: "24px", fontSize: "0.88rem", color: "#5a7a9e" },
  link: { color: "#00c9a7", fontWeight: 500 },
};
