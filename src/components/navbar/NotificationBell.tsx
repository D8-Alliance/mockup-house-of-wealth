import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { apiClient, BackendNotification } from '../../services/apiClient';
import { TAB_FOR_RESOURCE, timeAgo } from '../../notifications/notificationLinks';
import { NavTab } from '../../types';

const POLL_MS = 60_000;

/** The bell: the user's unread count from the server, and their latest notifications, each opening its screen. */
export const NotificationBell: React.FC<{ setTab: (tab: NavTab) => void }> = ({ setTab }) => {
  const { isAuthenticated, canAccessTab, currentRole } = useRBAC();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<BackendNotification[] | null>(null);

  const refreshCount = useCallback(() => {
    if (!isAuthenticated) { setUnread(0); return; }
    apiClient.getUnreadNotificationCount().then((result) => setUnread(result.count)).catch(() => undefined);
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCount();
    if (!isAuthenticated) return undefined;
    const timer = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshCount, isAuthenticated, currentRole]);

  const load = () => apiClient.getNotifications().then((list) => setItems(list.slice(0, 10))).catch(() => setItems([]));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) { setItems(null); void load(); refreshCount(); }
  };

  const openItem = (item: BackendNotification) => {
    if (!item.readAt) void apiClient.markNotificationRead(item.id).then(() => { refreshCount(); void load(); }).catch(() => undefined);
    const tab = item.resourceType ? TAB_FOR_RESOURCE[item.resourceType] : undefined;
    if (tab && canAccessTab(tab)) { setTab(tab); setOpen(false); }
  };

  const markAll = () => void apiClient.markAllNotificationsRead().then(() => { refreshCount(); void load(); }).catch(() => undefined);

  return (
    <div className="relative hidden lg:block">
      <button
        type="button"
        onClick={toggle}
        title={unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black leading-4 text-center ring-2 ring-white dark:ring-slate-900">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
              <div className="flex items-center gap-2">
                {unread > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full">{unread} new</span>}
                {unread > 0 && <button type="button" onClick={markAll} title="Mark all read" className="text-slate-400 hover:text-blue-600 cursor-pointer"><CheckCheck className="w-4 h-4" /></button>}
              </div>
            </div>
            {items === null ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-slate-400">No notifications yet.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto text-xs">
                {items.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => openItem(item)} className={`w-full text-left p-2.5 rounded-xl border cursor-pointer ${item.readAt ? 'border-slate-100 dark:border-slate-700' : 'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20'}`}>
                      <p className={`text-slate-800 dark:text-slate-200 ${item.readAt ? '' : 'font-bold'}`}>{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-3">{item.message}</p>
                      <span className="text-[10px] text-slate-400">{timeAgo(item.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
