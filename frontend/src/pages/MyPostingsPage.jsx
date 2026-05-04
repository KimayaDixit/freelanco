import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const fmtCurrency = (n, c) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD", maximumFractionDigits: 0 }).format(n);

export default function MyPostingsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const isFreelancer = user.role === "freelancer";

  const load = async () => {
    setLoading(true);
    try {
      const url = isFreelancer ? "/api/services/my" : "/api/jobs/my";
      const res = await api.get(url);
      setItems(isFreelancer ? res.data.services : res.data.jobs);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Remove this posting?")) return;
    setDeleting(id);
    try {
      const url = isFreelancer ? `/api/services/${id}` : `/api/jobs/${id}`;
      await api.delete(url);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {}
    finally { setDeleting(null); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div style={s.header}>
          <div>
            <h1 style={s.title}>My {isFreelancer ? "Services" : "Jobs"}</h1>
            <p style={s.sub}>{items.length} posting{items.length !== 1 ? "s" : ""}</p>
          </div>
          <a href={isFreelancer ? "/post-service" : "/post-job"}
            className={`btn btn-lg ${isFreelancer ? "btn-teal" : "btn-primary"}`}>
            + New {isFreelancer ? "Service" : "Job"}
          </a>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>{isFreelancer ? "🛠️" : "📢"}</div>
            <h3>No {isFreelancer ? "services" : "jobs"} yet</h3>
            <p>
              {isFreelancer
                ? "Post your first service listing to attract clients."
                : "Post your first job to find the right talent."}
            </p>
          </div>
        ) : (
          <div style={s.list}>
            {items.map(item => (
              <div key={item.id} className="card" style={s.card}>
                <div style={s.cardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span className={`badge ${isFreelancer ? "badge-teal" : "badge-amber"}`}>{item.domain}</span>
                      <span className={`badge ${item.is_active ? "badge-success" : "badge-gray"}`}>
                        {item.is_active ? "Active" : "Removed"}
                      </span>
                    </div>
                    <h3 style={s.itemTitle}>{item.title}</h3>
                    <p style={s.itemDesc}>
                      {item.description?.slice(0, 160)}{item.description?.length > 160 ? "..." : ""}
                    </p>
                  </div>
                  <div style={s.priceBlock}>
                    <span style={s.price}>
                      {fmtCurrency(isFreelancer ? item.cost : item.salary, item.currency)}
                    </span>
                    {isFreelancer && (
                      <span style={s.delivery}>🕐 {item.delivery_days} days</span>
                    )}
                  </div>
                </div>
                <div style={s.cardFooter}>
                  <span style={s.date}>
                    Posted {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {item.is_active && (
                    <button className="btn btn-danger btn-sm" onClick={() => remove(item.id)}
                      disabled={deleting === item.id}>
                      {deleting === item.id ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" },
  title: { fontFamily: "'Syne', sans-serif", fontSize: "2rem", fontWeight: 800 },
  sub: { color: "#5a7a9e", marginTop: "4px" },
  list: { display: "flex", flexDirection: "column", gap: "16px" },
  card: { cursor: "default" },
  cardTop: { display: "flex", gap: "20px", justifyContent: "space-between" },
  itemTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px" },
  itemDesc: { fontSize: "0.88rem", color: "#8fa3bf", lineHeight: 1.6 },
  priceBlock: { textAlign: "right", flexShrink: 0 },
  price: { display: "block", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "#f0a500" },
  delivery: { display: "block", fontSize: "0.78rem", color: "#5a7a9e", marginTop: "4px" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" },
  date: { fontSize: "0.78rem", color: "#3a5570" },
};
