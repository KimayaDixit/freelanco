import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const DOMAINS = [
  "All", "Web Development", "Mobile Development", "UI/UX Design", "Data Science",
  "Machine Learning", "DevOps", "Cloud Engineering", "Cybersecurity",
  "Blockchain", "Game Development", "Content Writing", "Digital Marketing",
  "Video Editing", "Graphic Design", "SEO", "Other"
];

export default function BrowseServicesPage() {
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [domain, setDomain] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/services", { params: { domain, search, page } });
        setServices(res.data.services);
        setTotal(res.data.total);
      } catch (e) {}
      finally { setLoading(false); }
    };
    load();
  }, [domain, search, page]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
  const totalPages = Math.ceil(total / 12);
  const fmtCost = (n, currency) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="page">
      <div className="container">
        <div style={s.header}>
          <h1 style={s.title}>Browse Talent & Services</h1>
          <p style={s.sub}>{total} services available</p>
        </div>

        <div style={s.filters}>
          <form onSubmit={handleSearch} style={s.searchForm}>
            <input className="form-input" placeholder="Search services or skills..." value={searchInput}
              onChange={e => setSearchInput(e.target.value)} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-teal">Search</button>
          </form>
          <div style={s.domains}>
            {DOMAINS.map(d => (
              <button key={d} onClick={() => { setDomain(d === "All" ? "" : d); setPage(1); }}
                style={{ ...s.domainBtn, ...(domain === (d === "All" ? "" : d) ? s.domainActive : {}) }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : services.length === 0 ? (
          <div className="empty-state">
            <h3>No services found</h3>
            <p>Try adjusting filters or broaden your search.</p>
          </div>
        ) : (
          <div className="grid-3">
            {services.map(svc => (
              <Link key={svc.id} to={`/services/${svc.id}`} style={{ textDecoration: "none" }}>
                <div className="card card-clickable" style={s.svcCard}>
                  <div style={s.cardTop}>
                    <span className="badge badge-amber">{svc.domain}</span>
                    <span style={s.cost}>{fmtCost(svc.cost, svc.currency)}</span>
                  </div>
                  <h3 style={s.svcTitle}>{svc.title}</h3>
                  <p style={s.freelancer}>
                    <span style={s.avatarSmall}>{svc.freelancer_name?.[0]?.toUpperCase() || "?"}</span>
                    {svc.freelancer_name || svc.freelancer_email}
                  </p>
                  <p style={s.svcDesc}>{svc.description.slice(0, 120)}{svc.description.length > 120 ? "..." : ""}</p>
                  <div style={s.cardFooter}>
                    <span style={s.delivery}>🕐 {svc.delivery_days} day{svc.delivery_days !== 1 ? "s" : ""} delivery</span>
                    <span style={s.viewLink}>View →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ color: "#5a7a9e", fontSize: "0.88rem" }}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  header: { marginBottom: "32px" },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "2rem", fontWeight: 800 },
  sub: { color: "#5a7a9e", marginTop: "4px" },
  filters: { marginBottom: "32px", display: "flex", flexDirection: "column", gap: "16px" },
  searchForm: { display: "flex", gap: "10px" },
  domains: { display: "flex", flexWrap: "wrap", gap: "8px" },
  domainBtn: { padding: "6px 14px", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 500, background: "transparent", border: "1px solid #253348", color: "#5a7a9e", cursor: "pointer", transition: "all 0.2s" },
  domainActive: { background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.3)", color: "#f0a500" },
  svcCard: { display: "flex", flexDirection: "column", gap: "10px", height: "100%" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cost: { fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#f0a500", fontSize: "1rem" },
  svcTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700, lineHeight: 1.35 },
  freelancer: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#5a7a9e" },
  avatarSmall: {
    width: "22px",
    height: "22px",
    background: "linear-gradient(135deg, #f0a500, #c98900)",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    fontWeight: 800,
    color: "#0a0e14",
    flexShrink: 0,
  },
  svcDesc: { fontSize: "0.88rem", color: "#8fa3bf", lineHeight: 1.6, flex: 1 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" },
  delivery: { fontSize: "0.78rem", color: "#3a5570" },
  viewLink: { fontSize: "0.82rem", color: "#f0a500", fontWeight: 500 },
};
