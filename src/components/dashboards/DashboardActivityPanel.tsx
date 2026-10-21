import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, ChevronRight, Handshake } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { apiClient, AssetEngagement, BackendNotification } from '../../services/apiClient';
import { NavTab } from '../../types';
import { TAB_FOR_RESOURCE, timeAgo } from '../../notifications/notificationLinks';

/** What needs the user's action, and their latest notifications, so the dashboard shows what is happening. */
export const DashboardActivityPanel: React.FC<{ setTab: (tab: NavTab) => void }> = ({ setTab }) => {
  const { currentRole, canAccessTab } = useRBAC();
  const [notifications, setNotifications] = useState<BackendNotification[] | null>(null);
  const [actions, setActions] = useState<AssetEngagement[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    apiClient.getNotifications().then((list) => setNotifications(list.slice(0, 6))).catch(() => setNotifications([]));
    apiClient.getUnreadNotificationCount().then((result) => setUnread(result.count)).catch(() => setUnread(0));
    if (canAccessTab('asset-partnerships')) apiClient.getAssetEngagements().then((list) => setActions(list.filter((item) => item.canRespond || item.canReview))).catch(() => setActions([]));
    else setActions([]);
  }, [canAccessTab]);

  useEffect(() => { load(); }, [load, currentRole]);

  const open = (notification: BackendNotification) => {
    if (!notification.readAt) void apiClient.markNotificationRead(notification.id).then(load).catch(() => undefined);
    const tab = notification.resourceType ? TAB_FOR_RESOURCE[notification.resourceType] : undefined;
    if (tab && canAccessTab(tab)) setTab(tab);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <section className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
        <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2"><Handshake className="w-5 h-5 text-amber-500" />Needs your action</h3>
        {actions.length === 0 ? (
          <p className="text-xs text-slate-400">Nothing is waiting for you.</p>
        ) : (
          <ul className="space-y-2">
            {actions.slice(0, 5).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setTab('asset-partnerships')} className="w-full text-left p-3 rounded-2xl border border-amber-300/60 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.asset.name} → {item.project.projectName}</div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">{item.canReview ? 'Your review is needed' : 'Your response is needed'} · {item.akad === 'IJARAH' ? 'Ijarah' : 'Musharakah'}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />Recent notifications
            {unread > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">{unread} new</span>}
          </h3>
          {unread > 0 && <button type="button" onClick={() => void apiClient.markAllNotificationsRead().then(load).catch(() => undefined)} className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"><CheckCheck className="w-3.5 h-3.5" />Mark all read</button>}
        </div>
        {notifications === null ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="text-xs text-slate-400">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {notifications.map((item) => {
              const tab = item.resourceType ? TAB_FOR_RESOURCE[item.resourceType] : undefined;
              const linked = Boolean(tab && canAccessTab(tab));
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => open(item)} className={`w-full text-left py-2.5 flex items-start gap-2 ${linked || !item.readAt ? 'cursor-pointer' : 'cursor-default'}`}>
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.readAt ? 'bg-transparent' : 'bg-blue-600'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs ${item.readAt ? 'text-slate-600 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white'}`}>{item.title}</span>
                      <span className="block text-[11px] text-slate-500 line-clamp-2">{item.message}</span>
                      <span className="block text-[10px] text-slate-400">{timeAgo(item.createdAt)}</span>
                    </span>
                    {linked && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
