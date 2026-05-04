import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logo}>⬡</div>
          <h1 style={s.title}>Welcome back</h1>
          <p style={s.sub}>Sign in to your Nexus account</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" placeholder="••••••••"
              value={form.password} onChange={handle} required />
          </div>
          <button type="submit" className="btn btn-teal btn-lg" style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p style={s.footer}>
          Don't have an account? <Link to="/register" style={s.link}>Create one</Link>
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
    background: "radial-gradient(ellipse at 50% 0%, rgba(0,201,167,0.05) 0%, transparent 60%)",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "40px",
  },
  header: { textAlign: "center", marginBottom: "32px" },
  logo: { fontSize: "2.5rem", color: "#00c9a7", marginBottom: "16px" },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "1.7rem", fontWeight: 800, marginBottom: "8px" },
  sub: { color: "#8fa3bf", fontSize: "0.9rem" },
  footer: { textAlign: "center", marginTop: "24px", fontSize: "0.88rem", color: "#5a7a9e" },
  link: { color: "#00c9a7", fontWeight: 500 },
};
