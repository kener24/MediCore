import { Menu } from "lucide-react";

import { Badge } from "../ui/Badge";
import { NotificationBell } from "../../features/notifications/NotificationBell";
import { useAuth } from "../../hooks/useAuth";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const roleName = user?.role_nombre ?? (typeof user?.role === "object" ? user.role.nombre : "usuario");

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center justify-between gap-4">
        <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={onMenuClick} type="button">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm text-slate-500">Bienvenido</p>
          <h1 className="text-lg font-semibold text-slate-900">{user?.nombre_completo ?? "MediCore"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-700">{user?.email}</p>
            <div className="mt-1 flex justify-end">
              <Badge tone="role">{roleName}</Badge>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
