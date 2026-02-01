
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in progress',
  ON_HOLD = 'on hold',
  DONE = 'done'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  tags: string[];
  status: TaskStatus;
  createdAt: number;
}

export interface TaskFormData {
  title: string;
  description: string;
  deadline: string;
  tags: string[];
  status: TaskStatus;
}
