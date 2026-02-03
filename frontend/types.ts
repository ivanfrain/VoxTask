
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in progress',
  ON_HOLD = 'on hold',
  DONE = 'done'
}

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro'
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  tier: SubscriptionTier;
  isAdmin: boolean;
  isBlocked: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  tags: string[];
  status: TaskStatus;
  createdAt: number;
  owner_id?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  deadline: string;
  tags: string[];
  status: TaskStatus;
}
