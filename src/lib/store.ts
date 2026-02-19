import { useMemo, useState } from "react";
import type { Project, Task, TaskStatus } from "./types";
import { MOCK_PROJECTS, MOCK_TASKS } from "./mockData";

type ProjectUpdate = Partial<Omit<Project, "id" | "createdAt">>;
export type TaskCreate = Omit<Task, "id" | "createdAt" | "updatedAt">;
export type TaskUpdate = Partial<Omit<Task, "id" | "createdAt" | "projectId">>;

export type DashboardRepo = {
  // Projects
  listProjects(): Promise<Project[]>;
  createProject(name: string): Promise<Project>;
  updateProject(id: string, patch: ProjectUpdate): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Tasks
  listTasks(projectId: string): Promise<Task[]>;
  createTask(input: TaskCreate): Promise<Task>;
  updateTask(id: string, patch: TaskUpdate): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  setTaskStatus(id: string, status: TaskStatus): Promise<Task>;
};

function sleep(ms = 120) {
  return new Promise((r) => setTimeout(r, ms));
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function createMockRepo(
  initial: {
    projects?: Project[];
    tasks?: Task[];
  } = { projects: MOCK_PROJECTS, tasks: MOCK_TASKS }
): DashboardRepo {
  let projects = [...(initial.projects ?? [])];
  let tasks = [...(initial.tasks ?? [])];

  return {
    async listProjects() {
      await sleep();
      return [...projects].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },

    async createProject(name) {
      await sleep();
      const p: Project = {
        id: uid("p"),
        name: name.trim() || "Untitled",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      projects = [p, ...projects];
      return p;
    },

    async updateProject(id, patch) {
      await sleep();
      const idx = projects.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Project not found");
      const next: Project = {
        ...projects[idx],
        ...patch,
        name: patch.name?.trim() ?? projects[idx].name,
        updatedAt: new Date().toISOString(),
      };
      projects[idx] = next;
      return next;
    },

    async deleteProject(id) {
      await sleep();
      projects = projects.filter((p) => p.id !== id);
      tasks = tasks.filter((t) => t.projectId !== id);
    },

    async listTasks(projectId) {
      await sleep();
      return tasks
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },

    async createTask(input) {
      await sleep();
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
      await sleep();
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Task not found");
      const next: Task = {
        ...tasks[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      tasks[idx] = next;
      return next;
    },

    async deleteTask(id) {
      await sleep();
      tasks = tasks.filter((t) => t.id !== id);
    },

    async setTaskStatus(id, status) {
      return this.updateTask(id, { status });
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
      const all = await repo.listProjects();
      setProjects(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function create(name: string) {
    const p = await repo.createProject(name);
    setProjects((prev) => (prev ? [p, ...prev] : [p]));
    return p;
  }

  async function rename(id: string, name: string) {
    const p = await repo.updateProject(id, { name });
    setProjects((prev) => (prev ? prev.map((x) => (x.id === id ? p : x)) : prev));
    return p;
  }

  async function remove(id: string) {
    await repo.deleteProject(id);
    setProjects((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  }

  return { projects, loading, error, refresh, create, rename, remove };
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
      const all = await repo.listTasks(projectId);
      setTasks(all);
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

  async function setStatus(id: string, status: TaskStatus) {
    const t = await repo.setTaskStatus(id, status);
    setTasks((prev) => (prev ? prev.map((x) => (x.id === id ? t : x)) : prev));
    return t;
  }

  return { tasks, loading, error, refresh, create, update, remove, setStatus };
}
