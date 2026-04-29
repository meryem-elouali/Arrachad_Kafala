import { Navigate, Outlet } from "react-router";

export default function ProtectedRoute() {
  const user = localStorage.getItem("user");

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}