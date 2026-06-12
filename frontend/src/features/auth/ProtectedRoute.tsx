import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Loader } from "../../components/ui/Loader";
import { useAuth } from "../../hooks/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <Loader label="Preparando tu sesión..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
