import { Navigate } from "react-router-dom";

import { Loader } from "../../components/ui/Loader";
import { useAuth } from "../../hooks/useAuth";
import { homePathForRole, roleNameFromUser } from "../../utils/roleHome";

export function RoleDashboardRedirect() {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <Loader label="Preparando panel..." />;
  }

  const target = homePathForRole(roleNameFromUser(user));
  if (target === "/dashboard") {
    return <Navigate to="/profile" replace />;
  }

  return <Navigate to={target} replace />;
}
