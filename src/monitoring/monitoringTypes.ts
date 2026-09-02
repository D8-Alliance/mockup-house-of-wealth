export type MilestoneStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delayed';

export interface ProjectMilestoneItem {
  id: string;
  projectId: string;
  title: string;
  targetDate: string;
  completionPercentage: number;
  budgetAllocated: number;
  actualSpent: number;
  status: MilestoneStatus;
  isPublicToInvestors: boolean;
  shariahSignoff: boolean;
  auditorSignoff: boolean;
}

export interface ProjectProgressUpdate {
  id: string;
  projectId: string;
  title: string;
  description: string;
  updateDate: string;
  completionPercentage: number;
  isPublicToInvestors: boolean;
  authorName: string;
  authorRole: string;
}
