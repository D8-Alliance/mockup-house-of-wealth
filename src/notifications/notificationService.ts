import { WorkflowNotification, NotificationType } from './notificationTypes';

class NotificationService {
  private notifications: WorkflowNotification[] = [
    {
      id: 'NOTIF-001',
      timestamp: '2026-08-11T10:30:00Z',
      recipientRole: 'Project Sponsor / Delivery Partner',
      title: 'Project Submission Acknowledged',
      message: 'FELDA Agri-Smart Plantation Expansion has been submitted and is under review.',
      type: 'info',
      resourceType: 'project',
      resourceId: 'PROJ-MYS-001',
      read: false
    },
    {
      id: 'NOTIF-002',
      timestamp: '2026-08-11T11:15:00Z',
      recipientRole: 'Shariah Board / Advisor',
      title: 'Shariah Structure Review Required',
      message: 'Proposed Mudarabah profit-sharing ratio for Pool Sukuk Agri-1 requires Shariah board sign-off.',
      type: 'action_required',
      resourceType: 'shariah',
      resourceId: 'SHAR-001',
      read: false
    },
    {
      id: 'NOTIF-003',
      timestamp: '2026-08-11T14:00:00Z',
      recipientRole: 'Pool Manager',
      title: 'Pool Fully Funded',
      message: 'Quaid-e-Azam Solar Infrastructure Pool target of $15,000,000 USD has been reached.',
      type: 'success',
      resourceType: 'pool',
      resourceId: 'POOL-MYS-P2-001',
      read: true
    }
  ];

  public getNotifications(userId?: string, role?: string): WorkflowNotification[] {
    return this.notifications.filter(n => {
      if (userId && n.recipientUserId === userId) return true;
      if (role && n.recipientRole === role) return true;
      return !n.recipientUserId && !n.recipientRole;
    });
  }

  public getAll(): WorkflowNotification[] {
    return [...this.notifications];
  }

  public notify(
    title: string,
    message: string,
    type: NotificationType,
    resourceType: 'project' | 'pool' | 'investment' | 'due_diligence' | 'shariah' | 'compliance' | 'risk' | 'disbursement' | 'distribution',
    resourceId: string,
    recipientRole?: string,
    recipientUserId?: string
  ): WorkflowNotification {
    const newNotif: WorkflowNotification = {
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipientRole,
      recipientUserId,
      title,
      message,
      type,
      resourceType,
      resourceId,
      read: false
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  public markAsRead(id: string) {
    const item = this.notifications.find(n => n.id === id);
    if (item) item.read = true;
  }

  public markAllAsRead() {
    this.notifications.forEach(n => (n.read = true));
  }
}

export const notificationService = new NotificationService();
