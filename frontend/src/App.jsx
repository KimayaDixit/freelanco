import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./index.css";

import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import DashboardPage from "./pages/DashboardPage";
import BrowseJobsPage from "./pages/BrowseJobsPage";
import BrowseServicesPage from "./pages/BrowseServicesPage";
import JobDetailPage from "./pages/JobDetailPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import PostJobPage from "./pages/PostJobPage";
import PostServicePage from "./pages/PostServicePage";
import ChatPage from "./pages/ChatPage";
import MyPostingsPage from "./pages/MyPostingsPage";

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/complete-profile" element={<PrivateRoute><CompleteProfilePage /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/browse/jobs" element={<PrivateRoute role="freelancer"><BrowseJobsPage /></PrivateRoute>} />
        <Route path="/browse/services" element={<PrivateRoute role="client"><BrowseServicesPage /></PrivateRoute>} />
        <Route path="/jobs/:id" element={<PrivateRoute><JobDetailPage /></PrivateRoute>} />
        <Route path="/services/:id" element={<PrivateRoute><ServiceDetailPage /></PrivateRoute>} />
        <Route path="/post-job" element={<PrivateRoute role="client"><PostJobPage /></PrivateRoute>} />
        <Route path="/post-service" element={<PrivateRoute role="freelancer"><PostServicePage /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/my-postings" element={<PrivateRoute><MyPostingsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
