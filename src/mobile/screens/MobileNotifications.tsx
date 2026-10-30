import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { apiClient, BackendNotification } from '../../services/apiClient';
import { useT } from '../i18n';

/**
 * The person's in-app notifications, newest first: KYC decisions, orders received and confirmed, and the rest the
 * platform sends. Opening one marks it read. Push through the super app delivers the same notifications later.
 */
export const MobileNotifications: React.FC<{ onBack: () => void; onUnreadChange: (count: number) => void }> = ({ onBack, onUnreadChange }) => {
  const { t, locale } = useT();
  const [items, setItems] = useState<BackendNotification[] | null>(null);
  const [open, setOpen] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    apiClient.getNotifications()
      .then((list) => { setItems(list); onUnreadChange(list.filter(item => !item.readAt).length); })
      .catch((cause) => { setItems((current) => current ?? []); setError(cause instanceof Error ? cause.message : t('Notifications could not be loaded.')); });
  }, [onUnreadChange, t]);
  useEffect(load, [load]);

  const read = (item: BackendNotification) => {
    setOpen(open === item.id ? '' : item.id);
    if (item.readAt) return;
    const now = new Date().toISOString();
    setItems((current) => {
      const next = (current ?? []).map(other => (other.id === item.id ? { ...other, readAt: now } : other));
      onUnreadChange(next.filter(other => !other.readAt).length);
      return next;
    });
    apiClient.markNotificationRead(item.id).catch(() => undefined);
  };

  const readAll = () => {
    const now = new Date().toISOString();
    setItems((current) => (current ?? []).map(item => ({ ...item, readAt: item.readAt ?? now })));
    onUnreadChange(0);
    apiClient.markAllNotificationsRead().catch(() => load());
  };

  const unread = (items ?? []).filter(item => !item.readAt).length;
  const when = (value: string) => new Date(value).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Back')}</button>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-black">{t('Notifications')}</h1>
        <div className="flex gap-2">
          {unread > 0 && <button type="button" onClick={readAll} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"><CheckCheck className="w-4 h-4" />{t('Mark all read')}</button>}
          <button type="button" onClick={load} aria-label={t('Refresh')} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!items && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {items && items.length === 0 && !error && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-2">
          <Bell className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm text-slate-500">{t('No notifications yet. Decisions on your KYC and your orders will appear here.')}</p>
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {items.map(item => (
            <li key={item.id}>
              <button type="button" onClick={() => read(item)} aria-expanded={open === item.id} className={`w-full text-left p-4 flex gap-3 ${item.readAt ? '' : 'bg-emerald-50/70 dark:bg-emerald-500/5'}`}>
                <span aria-hidden className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-emerald-500'}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${item.readAt ? 'font-bold' : 'font-black'}`}>{t(item.title)}{!item.readAt && <span className="sr-only"> ({t('unread')})</span>}</span>
                  <span className={`block text-xs text-slate-600 dark:text-slate-300 ${open === item.id ? '' : 'line-clamp-2'}`}>{item.message}</span>
                  <span className="block text-[11px] text-slate-400 mt-1">{when(item.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
