import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ postings: 0, requests: 0, connections: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const profileUrl = user.role === "freelancer" ? "/api/users/freelancer/profile" : "/api/users/client/profile";
        const [profileRes, connectionsRes, incomingRes] = await Promise.allSettled([
          api.get(profileUrl),
          api.get("/api/chat/connections"),
          api.get("/api/chat/requests/incoming"),
        ]);
        if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
        const connections = connectionsRes.status === "fulfilled" ? connectionsRes.value.data.connections.length : 0;
        const pending = incomingRes.status === "fulfilled"
          ? incomingRes.value.data.requests.filter(r => r.status === "pending").length : 0;
        setStats({ connections, requests: pending });
      } catch (e) {}
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const isFreelancer = user.role === "freelancer";

  return (
    <div className="page">
      <div className="container">
        {/* Welcome Header */}
        <div style={s.header}>
          <div>
            <p style={s.welcomeTag}>{isFreelancer ? "Freelancer Account" : "Client Account"}</p>
            <h1 style={s.welcome}>
              Welcome back{profile ? `, ${isFreelancer ? profile.full_name?.split(" ")[0] : profile.company_name}` : ""}
            </h1>
            <p style={s.sub}>Here's your workspace overview</p>
          </div>
          {!profile && (
            <div style={s.profileAlert}>
              <span>⚠️</span>
              <div>
                <strong>Complete your profile</strong>
                <p style={s.profileAlertSub}>Set up your profile so others can find and connect with you.</p>
              </div>
              <Link to="/complete-profile" className="btn btn-teal btn-sm">Complete →</Link>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={s.statsGrid}>
          {[
            { label: "Active Connections", value: stats.connections, icon: "🔗", color: "#00c9a7" },
            { label: "Pending Requests", value: stats.requests, icon: "📩", color: "#f0a500" },
            { label: "Profile Status", value: profile ? "Complete" : "Incomplete", icon: "✅", color: profile ? "#22c55e" : "#f05252" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={s.statCard}>
              <div style={{ ...s.statIcon, background: `${color}18`, color }}>{icon}</div>
              <div style={{ ...s.statValue, color }}>{value}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div className="grid-2" style={{ maxWidth: "800px" }}>
          {isFreelancer ? (
            <>
              <ActionCard icon="🔍" title="Browse Jobs" desc="Find job postings from clients looking for your skills." to="/browse/jobs" cta="Browse Jobs" primary />
              <ActionCard icon="🛠️" title="Offer a Service" desc="Create a service listing to showcase what you offer." to="/post-service" cta="Post Service" />
              <ActionCard icon="💬" title="Chat & Connections" desc="View your chat requests and active conversations." to="/chat" cta="Open Chat" />
              <ActionCard icon="📋" title="My Services" desc="Manage your posted service listings." to="/my-postings" cta="View Postings" />
            </>
          ) : (
            <>
              <ActionCard icon="🎯" title="Browse Talent" desc="Discover freelancers offering services you need." to="/browse/services" cta="Browse Services" primary />
              <ActionCard icon="📢" title="Post a Job" desc="Create a job listing and attract the right talent." to="/post-job" cta="Post Job" />
              <ActionCard icon="💬" title="Chat & Connections" desc="Review incoming requests and chat with freelancers." to="/chat" cta="Open Chat" />
              <ActionCard icon="📋" title="My Jobs" desc="Manage your active job postings." to="/my-postings" cta="View Jobs" />
            </>
          )}
        </div>

        {/* Profile Preview */}
        {profile && (
          <div style={s.profileSection}>
            <h2 style={s.sectionTitle}>Your Profile</h2>
            <div className="card" style={{ maxWidth: "600px" }}>
              <div style={s.profileHeader}>
                <div style={s.avatar}>{(isFreelancer ? profile.full_name : profile.company_name)?.[0]?.toUpperCase()}</div>
                <div>
                  <h3 style={s.profileName}>{isFreelancer ? profile.full_name : profile.company_name}</h3>
                  <span className={`badge ${isFreelancer ? "badge-teal" : "badge-amber"}`}>
                    {isFreelancer ? "Freelancer" : "Client"}
                  </span>
                </div>
              </div>
              <p style={s.profileDesc}>{profile.description}</p>
              {isFreelancer && profile.skills?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
                  {profile.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, to, cta, primary }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div className="card" style={s.actionCard}>
        <div style={s.actionIcon}>{icon}</div>
        <h3 style={s.actionTitle}>{title}</h3>
        <p style={s.actionDesc}>{desc}</p>
        <span className={`btn btn-sm ${primary ? "btn-teal" : "btn-ghost"}`} style={{ marginTop: "auto" }}>{cta} →</span>
      </div>
    </Link>
  );
}

const s = {
  header: { marginBottom: "40px" },
  welcomeTag: { fontSize: "0.8rem", fontWeight: 600, color: "#00c9a7", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" },
  welcome: { fontFamily: "'Syne', sans-serif", fontSize: "2.2rem", fontWeight: 800, marginBottom: "6px" },
  sub: { color: "#8fa3bf" },
  profileAlert: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    background: "rgba(240,165,0,0.06)",
    border: "1px solid rgba(240,165,0,0.2)",
    borderRadius: "12px",
    marginTop: "20px",
    fontSize: "0.9rem",
  },
  profileAlertSub: { color: "#8fa3bf", fontSize: "0.82rem", marginTop: "2px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "48px" },
  statCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    textAlign: "center",
  },
  statIcon: { width: "44px", height: "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", margin: "0 auto 12px" },
  statValue: { fontFamily: "'Syne', sans-serif", fontSize: "1.8rem", fontWeight: 800, marginBottom: "4px" },
  statLabel: { fontSize: "0.82rem", color: "#5a7a9e", fontWeight: 500 },
  sectionTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px", marginTop: "40px" },
  actionCard: { display: "flex", flexDirection: "column", gap: "8px", height: "100%", cursor: "pointer" },
  actionIcon: { fontSize: "1.8rem", marginBottom: "4px" },
  actionTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700 },
  actionDesc: { fontSize: "0.88rem", color: "#8fa3bf", lineHeight: 1.55 },
  profileSection: { marginTop: "16px" },
  profileHeader: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" },
  avatar: {
    width: "52px",
    height: "52px",
    background: "linear-gradient(135deg, #00c9a7, #009e84)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "1.4rem",
    color: "#0a0e14",
  },
  profileName: { fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: "6px" },
  profileDesc: { fontSize: "0.9rem", color: "#8fa3bf", lineHeight: 1.65 },
};
