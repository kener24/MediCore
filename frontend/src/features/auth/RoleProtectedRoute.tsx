import { Navigate, Outlet } from "react-router-dom";

import { Loader } from "../../components/ui/Loader";
import { useAuth } from "../../hooks/useAuth";

export function RoleProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const roleName = user?.role_nombre ?? (typeof user?.role === "object" ? user.role.nombre : "");

  if (isBootstrapping) {
    return <Loader label="Validando permisos..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(roleName)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
