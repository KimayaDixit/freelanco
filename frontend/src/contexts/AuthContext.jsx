import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      api.get("/api/auth/verify")
        .then(res => setUser(res.data.user))
        .catch(() => { logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem("token", t);
    api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  const register = async (email, password, role) => {
    const res = await api.post("/api/auth/register", { email, password, role });
    const { token: t, user: u } = res.data;
    localStorage.setItem("token", t);
    api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
