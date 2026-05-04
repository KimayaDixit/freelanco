import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { io } from "socket.io-client";

export default function ChatPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState("connections"); // connections | incoming | outgoing
  const [connections, setConnections] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { otherId, otherName, roomId }
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [connRes, inRes, outRes] = await Promise.allSettled([
        api.get("/api/chat/connections"),
        api.get("/api/chat/requests/incoming"),
        api.get("/api/chat/requests/outgoing"),
      ]);
      if (connRes.status === "fulfilled") setConnections(connRes.value.data.connections);
      if (inRes.status === "fulfilled") setIncoming(inRes.value.data.requests);
      if (outRes.status === "fulfilled") setOutgoing(outRes.value.data.requests);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const openChat = async (conn) => {
    const otherId = conn.sender_id === user.user_id ? conn.receiver_id : conn.sender_id;
    const otherName = conn.sender_id === user.user_id
      ? (conn.receiver_name || conn.receiver_email)
      : (conn.sender_name || conn.sender_email);
    const ids = [user.user_id, otherId].sort();
    const roomId = `room_${ids[0]}_${ids[1]}`;

    setActiveChat({ otherId, otherName, roomId });
    setMessages([]);

    try {
      const res = await api.get(`/api/chat/messages/${otherId}`);
      setMessages(res.data.messages.map(m => ({ ...m, created_at: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })));
    } catch (e) {}

    // Connect socket
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(process.env.REACT_APP_CHAT_URL || window.location.origin, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join", { token, room: roomId });
    socket.on("new_message", (msg) => {
      setMessages(prev => [...prev, { ...msg, created_at: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    });
  };

  const sendMessage = () => {
    if (!newMsg.trim() || !socketRef.current || !activeChat) return;
    socketRef.current.emit("send_message", {
      token, room: activeChat.roomId, content: newMsg.trim(), sender_name: user.email,
    });
    setNewMsg("");
  };

  const respondToRequest = async (reqId, action) => {
    setResponding(reqId);
    try {
      await api.post(`/api/chat/requests/${reqId}/respond`, { action });
      await loadAll();
    } catch (e) {}
    finally { setResponding(null); }
  };

  const pendingIncoming = incoming.filter(r => r.status === "pending");

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <h1 style={s.title}>Chat & Connections</h1>

        <div style={s.layout}>
          {/* Sidebar */}
          <div style={s.sidebar}>
            <div style={s.tabs}>
              {[
                { key: "connections", label: "Chats", count: connections.length },
                { key: "incoming", label: "Requests", count: pendingIncoming.length },
                { key: "outgoing", label: "Sent", count: 0 },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }}>
                  {t.label}
                  {t.count > 0 && <span style={s.badge}>{t.count}</span>}
                </button>
              ))}
            </div>

            <div style={s.list}>
              {tab === "connections" && (
                connections.length === 0
                  ? <p style={s.empty}>No connections yet.</p>
                  : connections.map(conn => {
                    const otherId = conn.sender_id === user.user_id ? conn.receiver_id : conn.sender_id;
                    const otherName = conn.sender_id === user.user_id
                      ? (conn.receiver_name || conn.receiver_email)
                      : (conn.sender_name || conn.sender_email);
                    const isActive = activeChat?.otherId === otherId;
                    return (
                      <div key={conn.id} onClick={() => openChat(conn)}
                        style={{ ...s.connItem, ...(isActive ? s.connItemActive : {}) }}>
                        <div style={s.avatar}>{otherName?.[0]?.toUpperCase() || "?"}</div>
                        <div>
                          <div style={s.connName}>{otherName}</div>
                          <div style={s.connCtx}>re: {conn.context_title || conn.context_type}</div>
                        </div>
                      </div>
                    );
                  })
              )}

              {tab === "incoming" && (
                incoming.length === 0
                  ? <p style={s.empty}>No incoming requests.</p>
                  : incoming.map(req => (
                    <div key={req.id} style={s.reqCard}>
                      <div style={s.reqHeader}>
                        <div style={{ ...s.avatar, background: "linear-gradient(135deg,#f0a500,#c98900)" }}>
                          {req.sender_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div style={s.connName}>{req.sender_name || req.sender_email}</div>
                          <span className={`badge badge-${req.status === "pending" ? "amber" : req.status === "accepted" ? "success" : "danger"}`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                      <p style={s.reqCtx}>re: {req.context_title} ({req.context_type})</p>
                      {req.message && <p style={s.reqMsg}>"{req.message}"</p>}
                      {req.status === "pending" && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          <button className="btn btn-teal btn-sm" onClick={() => respondToRequest(req.id, "accept")}
                            disabled={responding === req.id}>Accept</button>
                          <button className="btn btn-danger btn-sm" onClick={() => respondToRequest(req.id, "reject")}
                            disabled={responding === req.id}>Decline</button>
                        </div>
                      )}
                    </div>
                  ))
              )}

              {tab === "outgoing" && (
                outgoing.length === 0
                  ? <p style={s.empty}>No sent requests.</p>
                  : outgoing.map(req => (
                    <div key={req.id} style={s.reqCard}>
                      <div style={s.reqHeader}>
                        <div style={s.avatar}>{req.receiver_name?.[0]?.toUpperCase() || "?"}</div>
                        <div>
                          <div style={s.connName}>{req.receiver_name || req.receiver_email}</div>
                          <span className={`badge badge-${req.status === "pending" ? "amber" : req.status === "accepted" ? "success" : "danger"}`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                      <p style={s.reqCtx}>re: {req.context_title} ({req.context_type})</p>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div style={s.chatPanel}>
            {!activeChat ? (
              <div style={s.noChatState}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>💬</div>
                <h3 style={s.noChatTitle}>Select a conversation</h3>
                <p style={s.noChatSub}>Choose a connection from the sidebar to start chatting.</p>
              </div>
            ) : (
              <>
                <div style={s.chatHeader}>
                  <div style={s.avatar}>{activeChat.otherName?.[0]?.toUpperCase()}</div>
                  <div style={s.chatHeaderName}>{activeChat.otherName}</div>
                </div>
                <div style={s.messages}>
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === user.user_id;
                    return (
                      <div key={i} style={{ ...s.msgRow, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                        <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleTheirs) }}>
                          <p style={s.bubbleText}>{msg.content}</p>
                          <span style={s.bubbleTime}>{msg.created_at}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <div style={s.inputRow}>
                  <input className="form-input" style={{ flex: 1 }} placeholder="Type a message..."
                    value={newMsg} onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                  <button className="btn btn-teal" onClick={sendMessage} disabled={!newMsg.trim()}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  title: { fontFamily: "'Syne', sans-serif", fontSize: "2rem", fontWeight: 800, marginBottom: "24px" },
  layout: { display: "flex", gap: "20px", height: "calc(100vh - 220px)", minHeight: "500px" },
  sidebar: { width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" },
  tabs: { display: "flex", borderBottom: "1px solid var(--border)" },
  tab: { flex: 1, padding: "12px 8px", background: "none", border: "none", color: "#5a7a9e", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" },
  tabActive: { color: "#00c9a7", borderBottom: "2px solid #00c9a7" },
  badge: { background: "#f0a500", color: "#0a0e14", borderRadius: "100px", fontSize: "0.7rem", fontWeight: 700, padding: "1px 6px" },
  list: { flex: 1, overflowY: "auto", padding: "8px" },
  empty: { color: "#5a7a9e", fontSize: "0.85rem", textAlign: "center", padding: "24px 16px" },
  connItem: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "8px", cursor: "pointer", transition: "background 0.15s" },
  connItemActive: { background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.2)" },
  avatar: { width: "38px", height: "38px", background: "linear-gradient(135deg,#00c9a7,#009e84)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", color: "#0a0e14", flexShrink: 0 },
  connName: { fontWeight: 600, fontSize: "0.9rem" },
  connCtx: { fontSize: "0.78rem", color: "#5a7a9e" },
  reqCard: { padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "8px" },
  reqHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  reqCtx: { fontSize: "0.8rem", color: "#5a7a9e", marginBottom: "4px" },
  reqMsg: { fontSize: "0.82rem", color: "#8fa3bf", fontStyle: "italic" },
  chatPanel: { flex: 1, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" },
  noChatState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#5a7a9e" },
  noChatTitle: { fontFamily: "'Syne', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#8fa3bf", marginBottom: "8px" },
  noChatSub: { fontSize: "0.88rem" },
  chatHeader: { display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  chatHeaderName: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
  messages: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" },
  msgRow: { display: "flex" },
  bubble: { maxWidth: "65%", padding: "10px 14px", borderRadius: "12px" },
  bubbleMine: { background: "rgba(0,201,167,0.15)", borderBottomRightRadius: "4px" },
  bubbleTheirs: { background: "var(--bg-3)", borderBottomLeftRadius: "4px" },
  bubbleText: { fontSize: "0.92rem", lineHeight: 1.55 },
  bubbleTime: { fontSize: "0.7rem", color: "#5a7a9e", marginTop: "4px", display: "block", textAlign: "right" },
  inputRow: { display: "flex", gap: "10px", padding: "16px 20px", borderTop: "1px solid var(--border)" },
};
