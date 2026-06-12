import { useEffect, useState } from "react";
import { Bell, CheckCheck, Inbox, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "../../api/axios";
import { getNotificationSummary, markAllNotificationsRead, markNotificationRead } from "../../api/notificationsApi";
import type { NotificationSummary } from "../../types/notification";

function shortDate(value: string) {
  return new Date(value).toLocaleString();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const unread = summary?.unread_count ?? 0;

  async function load() {
    try {
      setSummary(await getNotificationSummary());
    } catch {
      setSummary(null);
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    return () => window.clearInterval(id);
  }, []);

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      await load();
      toast.success("Notificaciones marcadas como leidas.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function markRead(id: number) {
    try {
      await markNotificationRead(id);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="relative">
      <button
        className="relative rounded-md border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
        onClick={() => setOpen((value) => !value)}
        type="button"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 text-center text-xs font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-[min(90vw,24rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
              <p className="text-xs text-slate-500">{unread} pendientes</p>
            </div>
            <div className="flex gap-1">
              <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100" onClick={markAllRead} type="button" title="Marcar todo leido">
                <CheckCheck className="h-4 w-4" />
              </button>
              <Link className="rounded-md p-2 text-slate-600 hover:bg-slate-100" to="/notifications/preferences" title="Preferencias">
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {summary?.latest.length ? (
              summary.latest.map((item) => (
                <div key={item.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                  <Link className="block" to={`/notifications/${item.id}`} onClick={() => setOpen(false)}>
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{shortDate(item.creado_en)}</p>
                  </Link>
                  {item.status === "unread" ? (
                    <button className="mt-2 text-xs font-semibold text-brand-700 hover:text-brand-900" onClick={() => markRead(item.id)} type="button">
                      Marcar leida
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-slate-500">
                <Inbox className="h-6 w-6" />
                No tienes notificaciones.
              </div>
            )}
          </div>
          <Link className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50" to="/notifications" onClick={() => setOpen(false)}>
            Ver centro de notificaciones
          </Link>
        </div>
      ) : null}
    </div>
  );
}
