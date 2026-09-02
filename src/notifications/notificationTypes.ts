export type NotificationType = 'info' | 'action_required' | 'approval' | 'alert' | 'success';

export interface WorkflowNotification {
  id: string;
  timestamp: string;
  recipientUserId?: string;
  recipientRole?: string;
  title: string;
  message: string;
  type: NotificationType;
  resourceType: 'project' | 'pool' | 'investment' | 'due_diligence' | 'shariah' | 'compliance' | 'risk' | 'disbursement' | 'distribution';
  resourceId: string;
  read: boolean;
}
