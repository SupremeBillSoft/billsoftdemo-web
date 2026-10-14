// src/features/auth/ProtectedRoute.tsx

import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

// One-line: a route-level gate — reads auth state once and either renders
// the nested routes (<Outlet/>) or bounces to /login; this is the ONE place
// "is the user allowed in" is decided, not repeated in every page component.
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}