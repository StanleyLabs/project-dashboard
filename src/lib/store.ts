import { useMemo, useState } from "react";
import type { Task, TaskStatus } from "./types";
import { MOCK_TASKS } from "./mockData";

export type TaskUpdate = Partial<Omit<Task, "id" | "createdAt">>;

export type TaskRepo = {
  list(): Promise<Task[]>;
  update(id: string, patch: TaskUpdate): Promise<Task>;
};

// In v2 this becomes a Supabase-backed repo (same interface).
export function createMockRepo(initial: Task[] = MOCK_TASKS): TaskRepo {
  let data = [...initial];

  return {
    async list() {
      // simulate latency
      await new Promise((r) => setTimeout(r, 120));
      return [...data].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },
    async update(id, patch) {
      await new Promise((r) => setTimeout(r, 120));
      const idx = data.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Task not found");
      const next: Task = {
        ...data[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      data[idx] = next;
      return next;
    },
  };
}

export function useTaskRepo() {
  return useMemo(() => createMockRepo(), []);
}

export function useTasks(repo: TaskRepo) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const all = await repo.list();
      setTasks(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function patchTask(id: string, patch: TaskUpdate) {
    const next = await repo.update(id, patch);
    setTasks((prev) => (prev ? prev.map((t) => (t.id === id ? next : t)) : prev));
  }

  async function setStatus(id: string, status: TaskStatus) {
    return patchTask(id, { status });
  }

  return {
    tasks,
    loading,
    error,
    refresh,
    patchTask,
    setStatus,
  };
}
