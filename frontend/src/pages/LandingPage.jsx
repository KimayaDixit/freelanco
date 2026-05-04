import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div style={s.page}>
      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroGlow} />
        <div style={s.heroContent}>
          <div style={s.pill}>✦ The Modern Freelance Network</div>
          <h1 style={s.headline}>
            Where <span style={s.accentText}>Talent</span> Meets<br />
            <span style={s.tealText}>Opportunity</span>
          </h1>
          <p style={s.subline}>
            A curated platform for elite freelancers and visionary clients.<br />
            Post jobs, offer services, and connect — all in one place.
          </p>
          <div style={s.heroBtns}>
            <Link to="/register" style={s.btnPrimary}>Start as Freelancer</Link>
            <Link to="/register" style={s.btnGhost}>I'm Hiring</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={s.stats}>
        <div className="container">
          <div style={s.statsGrid}>
            {[
              { n: "10K+", l: "Freelancers" },
              { n: "5K+", l: "Projects Posted" },
              { n: "98%", l: "Satisfaction Rate" },
              { n: "150+", l: "Skill Domains" },
            ].map(({ n, l }) => (
              <div key={l} style={s.statItem}>
                <span style={s.statNum}>{n}</span>
                <span style={s.statLabel}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={s.features}>
        <div className="container">
          <h2 style={s.sectionTitle}>Everything you need,<br />nothing you don't</h2>
          <div className="grid-3" style={{ marginTop: "48px" }}>
            {[
              { icon: "🔍", title: "Smart Browsing", desc: "Freelancers discover jobs; clients discover talent — filtered by domain, budget, and more." },
              { icon: "💬", title: "Secure Chat", desc: "Send a connect request. Once accepted, enjoy end-to-end private messaging inside the platform." },
              { icon: "🎯", title: "Curated Profiles", desc: "Freelancers showcase their skills. Clients present their companies. Quality over quantity." },
              { icon: "📋", title: "Job & Service Posts", desc: "Post detailed job listings or service offerings with domain tags, pricing, and requirements." },
              { icon: "🛡️", title: "Role-Based Access", desc: "Freelancers and clients see different views tailored to their workflow." },
              { icon: "⚡", title: "Real-Time Messaging", desc: "Instant WebSocket-powered chat so you never miss a conversation." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card fade-up" style={s.featureCard}>
                <div style={s.featureIcon}>{icon}</div>
                <h3 style={s.featureTitle}>{title}</h3>
                <p style={s.featureDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Ready to build something great?</h2>
          <p style={s.ctaSub}>Join thousands of professionals already on Nexus.</p>
          <Link to="/register" style={s.btnPrimary}>Create Your Free Account →</Link>
        </div>
      </section>
    </div>
  );
}

const s = {
  page: { background: "var(--bg)" },
  hero: {
    position: "relative",
    minHeight: "90vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: "80px 24px",
  },
  heroGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "800px",
    height: "500px",
    background: "radial-gradient(ellipse at center, rgba(0,201,167,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroContent: { textAlign: "center", maxWidth: "760px", position: "relative", zIndex: 1 },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 18px",
    background: "rgba(0,201,167,0.08)",
    border: "1px solid rgba(0,201,167,0.2)",
    borderRadius: "100px",
    fontSize: "0.82rem",
    color: "#00c9a7",
    fontWeight: 600,
    letterSpacing: "0.05em",
    marginBottom: "28px",
  },
  headline: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "clamp(2.8rem, 7vw, 5rem)",
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
    marginBottom: "24px",
    color: "#e8edf5",
  },
  accentText: { color: "#f0a500" },
  tealText: { color: "#00c9a7" },
  subline: { fontSize: "1.1rem", color: "#8fa3bf", lineHeight: 1.7, marginBottom: "40px" },
  heroBtns: { display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "14px 32px",
    background: "#f0a500",
    color: "#0a0e14",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "0.95rem",
    textDecoration: "none",
    transition: "all 0.2s",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    padding: "14px 32px",
    background: "transparent",
    color: "#e8edf5",
    borderRadius: "10px",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
    border: "1px solid #253348",
  },
  stats: { padding: "40px 0", borderTop: "1px solid #1a2232", borderBottom: "1px solid #1a2232" },
  statsGrid: { display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "24px" },
  statItem: { textAlign: "center" },
  statNum: { display: "block", fontFamily: "'Syne', sans-serif", fontSize: "2.4rem", fontWeight: 800, color: "#00c9a7" },
  statLabel: { fontSize: "0.88rem", color: "#5a7a9e", fontWeight: 500 },
  features: { padding: "100px 0" },
  sectionTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
    fontWeight: 800,
    textAlign: "center",
    letterSpacing: "-0.02em",
  },
  featureCard: { cursor: "default" },
  featureIcon: { fontSize: "2rem", marginBottom: "16px" },
  featureTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px" },
  featureDesc: { fontSize: "0.9rem", color: "#8fa3bf", lineHeight: 1.65 },
  cta: { padding: "100px 24px", textAlign: "center" },
  ctaInner: {
    maxWidth: "560px",
    margin: "0 auto",
    background: "var(--surface)",
    border: "1px solid var(--border-2)",
    borderRadius: "20px",
    padding: "60px 40px",
  },
  ctaTitle: { fontFamily: "'Syne', sans-serif", fontSize: "2rem", fontWeight: 800, marginBottom: "12px" },
  ctaSub: { color: "#8fa3bf", marginBottom: "32px" },
};
