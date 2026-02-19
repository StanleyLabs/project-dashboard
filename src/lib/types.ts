export type Id = string;

export type Project = {
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatus = "backlog" | "in_progress" | "blocked" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: Id;
  projectId: Id;
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
