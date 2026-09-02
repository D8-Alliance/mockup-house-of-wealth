import React, { useState } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  ShieldAlert, 
  TrendingUp, 
  Coins, 
  FileText, 
  Check, 
  Trash2,
  Clock
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'profit' | 'security' | 'compliance' | 'pool';
  read: boolean;
}

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'NOTIF-01',
      title: 'Mudarabah Profit Payout Swept',
      message: 'Your monthly yield of $28,500 from KL Logistics Sukuk Pool has been deposited into your Profit Wallet.',
      timestamp: '10 mins ago',
      type: 'profit',
      read: false
    },
    {
      id: 'NOTIF-02',
      title: 'AAOIFI Shariah Compliance Audit Passed',
      message: 'The annual Shariah audit for Karachi Port Commercial Pool has been completed with 100% compliance rating.',
      timestamp: '2 hours ago',
      type: 'compliance',
      read: false
    },
    {
      id: 'NOTIF-03',
      title: 'New Pool Opportunity Launched',
      message: 'Nigeria Green Sukuk Solar Pool is now open for investor participation under Mudarabah rules.',
      timestamp: '1 day ago',
      type: 'pool',
      read: true
    },
    {
      id: 'NOTIF-04',
      title: 'Security Alert: New Sign-in Node',
      message: 'Authorized access recorded from Kuala Lumpur, Malaysia (IP: 210.186.42.10).',
      timestamp: '3 days ago',
      type: 'security',
      read: true
    }
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Notification Center</h1>
          <p className="text-sm text-slate-500">Real-time alerts for profit payouts, pool lifecycles, and Shariah audit clearance.</p>
        </div>
        <button 
          onClick={markAllRead}
          className="px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl hover:bg-emerald-100 cursor-pointer"
        >
          Mark All as Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map(n => (
          <div 
            key={n.id}
            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
              n.read 
                ? 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 opacity-80' 
                : 'bg-emerald-50/50 dark:bg-slate-800 border-emerald-500/40 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                n.type === 'profit' ? 'bg-emerald-500/10 text-emerald-600' :
                n.type === 'compliance' ? 'bg-blue-500/10 text-blue-600' :
                n.type === 'security' ? 'bg-amber-500/10 text-amber-600' :
                'bg-purple-500/10 text-purple-600'
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{n.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{n.message}</p>
                <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {n.timestamp}
                </div>
              </div>
            </div>

            {!n.read && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
