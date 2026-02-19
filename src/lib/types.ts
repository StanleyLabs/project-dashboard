export type TaskStatus = "backlog" | "in_progress" | "blocked" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: {
    name: string;
    initials: string;
  };
  due?: string; // ISO date
  tags?: string[];
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
};
