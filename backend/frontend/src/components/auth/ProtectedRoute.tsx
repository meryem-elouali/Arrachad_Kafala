import { Navigate, Outlet } from "react-router";

export default function ProtectedRoute() {
  return localStorage.getItem("lajna_user") ? <Outlet /> : <Navigate to="/" replace />;
}