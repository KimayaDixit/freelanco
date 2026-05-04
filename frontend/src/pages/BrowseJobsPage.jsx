import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const DOMAINS = [
  "All", "Web Development", "Mobile Development", "UI/UX Design", "Data Science",
  "Machine Learning", "DevOps", "Cloud Engineering", "Cybersecurity",
  "Blockchain", "Game Development", "Content Writing", "Digital Marketing",
  "Video Editing", "Graphic Design", "SEO", "Other"
];

export default function BrowseJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [domain, setDomain] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/jobs", { params: { domain, search, page } });
      setJobs(res.data.jobs);
      setTotal(res.data.total);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [domain, search, page]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const formatSalary = (n, currency) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(n);
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="page">
      <div className="container">
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Browse Jobs</h1>
            <p style={s.sub}>{total} opportunities available</p>
          </div>
        </div>

        {/* Filters */}
        <div style={s.filters}>
          <form onSubmit={handleSearch} style={s.searchForm}>
            <input className="form-input" placeholder="Search jobs..." value={searchInput}
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

        {/* Grid */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <h3>No jobs found</h3>
            <p>Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid-3">
            {jobs.map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`} style={{ textDecoration: "none" }}>
                <div className="card card-clickable" style={s.jobCard}>
                  <div style={s.cardTop}>
                    <span className="badge badge-teal">{job.domain}</span>
                    <span style={s.salary}>{formatSalary(job.salary, job.currency)}</span>
                  </div>
                  <h3 style={s.jobTitle}>{job.title}</h3>
                  {job.company_name && <p style={s.company}>🏢 {job.company_name}</p>}
                  <p style={s.jobDesc}>{job.description.slice(0, 120)}{job.description.length > 120 ? "..." : ""}</p>
                  <div style={s.cardFooter}>
                    <span style={s.date}>{new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span style={s.viewLink}>View Details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
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
  domainBtn: {
    padding: "6px 14px",
    borderRadius: "100px",
    fontSize: "0.82rem",
    fontWeight: 500,
    background: "transparent",
    border: "1px solid #253348",
    color: "#5a7a9e",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  domainActive: { background: "rgba(0,201,167,0.1)", border: "1px solid rgba(0,201,167,0.3)", color: "#00c9a7" },
  jobCard: { display: "flex", flexDirection: "column", gap: "10px", height: "100%" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  salary: { fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#f0a500", fontSize: "1rem" },
  jobTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700, lineHeight: 1.35 },
  company: { fontSize: "0.82rem", color: "#5a7a9e" },
  jobDesc: { fontSize: "0.88rem", color: "#8fa3bf", lineHeight: 1.6, flex: 1 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" },
  date: { fontSize: "0.78rem", color: "#3a5570" },
  viewLink: { fontSize: "0.82rem", color: "#00c9a7", fontWeight: 500 },
};
