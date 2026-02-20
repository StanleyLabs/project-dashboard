import { useMemo, useState } from "react";
import type { Project, Task, TaskStatus } from "./types";
import { MOCK_PROJECTS, MOCK_TASKS } from "./mockData";

export type TaskCreate = Omit<Task, "id" | "createdAt" | "updatedAt">;
export type TaskUpdate = Partial<Omit<Task, "id" | "createdAt" | "projectId">>;
type ProjectUpdate = Partial<Omit<Project, "id" | "createdAt">>;

export type DashboardRepo = {
  listProjects(): Promise<Project[]>;
  createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project>;
  updateProject(id: string, patch: ProjectUpdate): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  listTasks(projectId: string): Promise<Task[]>;
  createTask(input: TaskCreate): Promise<Task>;
  updateTask(id: string, patch: TaskUpdate): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  reorderTask(id: string, newStatus: TaskStatus, newOrder: number): Promise<Task>;
};

let counter = 0;
function uid(prefix: string) {
  return `${prefix}-${++counter}-${Date.now().toString(36)}`;
}

export function createMockRepo(): DashboardRepo {
  let projects = [...MOCK_PROJECTS];
  let tasks = [...MOCK_TASKS];

  return {
    async listProjects() {
      return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async createProject(data) {
      const p: Project = {
        ...data,
        id: uid("p"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      projects = [p, ...projects];
      return p;
    },
    async updateProject(id, patch) {
      const idx = projects.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Project not found");
      projects[idx] = { ...projects[idx], ...patch, updatedAt: new Date().toISOString() };
      return projects[idx];
    },
    async deleteProject(id) {
      projects = projects.filter((p) => p.id !== id);
      tasks = tasks.filter((t) => t.projectId !== id);
    },
    async listTasks(projectId) {
      return tasks
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => a.order - b.order || b.updatedAt.localeCompare(a.updatedAt));
    },
    async createTask(input) {
      const t: Task = {
        ...input,
        id: uid("t"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tasks = [t, ...tasks];
      return t;
    },
    async updateTask(id, patch) {
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Task not found");
      tasks[idx] = { ...tasks[idx], ...patch, updatedAt: new Date().toISOString() };
      return tasks[idx];
    },
    async deleteTask(id) {
      tasks = tasks.filter((t) => t.id !== id);
    },
    async reorderTask(id, newStatus, newOrder) {
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Task not found");
      const task = tasks[idx];
      const oldStatus = task.status;

      // Update orders in the target column
      const targetTasks = tasks
        .filter((t) => t.id !== id && t.projectId === task.projectId && t.status === newStatus)
        .sort((a, b) => a.order - b.order);

      targetTasks.splice(newOrder, 0, { ...task, status: newStatus });
      targetTasks.forEach((t, i) => {
        const ti = tasks.findIndex((x) => x.id === t.id);
        if (ti !== -1) tasks[ti] = { ...tasks[ti], order: i, status: newStatus, updatedAt: new Date().toISOString() };
      });

      // If moved to a different column, reorder the old column
      if (oldStatus !== newStatus) {
        const oldTasks = tasks
          .filter((t) => t.projectId === task.projectId && t.status === oldStatus)
          .sort((a, b) => a.order - b.order);
        oldTasks.forEach((t, i) => {
          const ti = tasks.findIndex((x) => x.id === t.id);
          if (ti !== -1) tasks[ti] = { ...tasks[ti], order: i };
        });
      }

      return tasks[idx];
    },
  };
}

export function useDashboardRepo() {
  return useMemo(() => createMockRepo(), []);
}

export function useProjects(repo: DashboardRepo) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      setProjects(await repo.listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function create(data: Omit<Project, "id" | "createdAt" | "updatedAt">) {
    const p = await repo.createProject(data);
    setProjects((prev) => (prev ? [p, ...prev] : [p]));
    return p;
  }

  async function update(id: string, patch: ProjectUpdate) {
    const p = await repo.updateProject(id, patch);
    setProjects((prev) => (prev ? prev.map((x) => (x.id === id ? p : x)) : prev));
    return p;
  }

  async function remove(id: string) {
    await repo.deleteProject(id);
    setProjects((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  }

  return { projects, loading, error, refresh, create, update, remove };
}

export function useTasks(repo: DashboardRepo, projectId: string | null) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      setTasks(await repo.listTasks(projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function create(input: TaskCreate) {
    const t = await repo.createTask(input);
    setTasks((prev) => (prev ? [t, ...prev] : [t]));
    return t;
  }

  async function update(id: string, patch: TaskUpdate) {
    const t = await repo.updateTask(id, patch);
    setTasks((prev) => (prev ? prev.map((x) => (x.id === id ? t : x)) : prev));
    return t;
  }

  async function remove(id: string) {
    await repo.deleteTask(id);
    setTasks((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  }

  async function reorder(id: string, newStatus: TaskStatus, newOrder: number) {
    await repo.reorderTask(id, newStatus, newOrder);
    if (projectId) {
      setTasks(await repo.listTasks(projectId));
    }
  }

  return { tasks, loading, error, refresh, create, update, remove, reorder };
}
