import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/"); };
  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to={user ? "/dashboard" : "/"} style={styles.logo}>
          <span style={styles.logoIcon}>⬡</span>
          <span style={styles.logoText}>Nexus</span>
          <span style={styles.logoDot}>.</span>
        </Link>
        <div style={styles.links}>
          {user ? (
            <>
              <Link to="/dashboard" style={{...styles.link, ...(isActive("/dashboard") ? styles.linkActive : {})}}>Dashboard</Link>
              {user.role === "freelancer" && (
                <>
                  <Link to="/browse/jobs" style={{...styles.link, ...(isActive("/browse/jobs") ? styles.linkActive : {})}}>Browse Jobs</Link>
                  <Link to="/post-service" style={{...styles.link, ...(isActive("/post-service") ? styles.linkActive : {})}}>Offer Service</Link>
                </>
              )}
              {user.role === "client" && (
                <>
                  <Link to="/browse/services" style={{...styles.link, ...(isActive("/browse/services") ? styles.linkActive : {})}}>Browse Talent</Link>
                  <Link to="/post-job" style={{...styles.link, ...(isActive("/post-job") ? styles.linkActive : {})}}>Post Job</Link>
                </>
              )}
              <Link to="/my-postings" style={{...styles.link, ...(isActive("/my-postings") ? styles.linkActive : {})}}>My Postings</Link>
              <Link to="/chat" style={{...styles.chatLink, ...(isActive("/chat") ? styles.chatLinkActive : {})}}>
                💬 Chat
              </Link>
              <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link}>Sign In</Link>
              <Link to="/register" style={styles.ctaBtn}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(10,14,20,0.92)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid #1a2232",
    height: "64px",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 24px",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    textDecoration: "none",
  },
  logoIcon: { fontSize: "1.4rem", color: "#00c9a7" },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#e8edf5",
    letterSpacing: "-0.02em",
  },
  logoDot: { fontSize: "1.6rem", color: "#f0a500", lineHeight: 1, marginTop: "-4px" },
  links: { display: "flex", alignItems: "center", gap: "4px" },
  link: {
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: 500,
    color: "#8fa3bf",
    textDecoration: "none",
    transition: "color 0.2s, background 0.2s",
  },
  linkActive: { color: "#e8edf5", background: "#1a2232" },
  chatLink: {
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: 500,
    color: "#f0a500",
    textDecoration: "none",
    border: "1px solid rgba(240,165,0,0.2)",
    background: "rgba(240,165,0,0.06)",
  },
  chatLinkActive: { background: "rgba(240,165,0,0.12)" },
  logoutBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: 500,
    background: "transparent",
    color: "#5a7a9e",
    border: "1px solid #253348",
    cursor: "pointer",
    marginLeft: "8px",
  },
  ctaBtn: {
    padding: "9px 20px",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: 600,
    background: "#00c9a7",
    color: "#0a0e14",
    textDecoration: "none",
    marginLeft: "8px",
  },
};
