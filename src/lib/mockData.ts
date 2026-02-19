import type { Task } from "./types";

function nowIso() {
  return new Date().toISOString();
}

export const MOCK_TASKS: Task[] = [
  {
    id: "t-101",
    title: "Define MVP scope",
    description: "What does v1 ship with? What is explicitly out?",
    status: "backlog",
    priority: "high",
    assignee: { name: "Ken", initials: "KS" },
    tags: ["planning"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "t-102",
    title: "Design task card component",
    description: "Supports priority, tags, due date, and quick actions.",
    status: "in_progress",
    priority: "medium",
    assignee: { name: "TARS", initials: "TA" },
    tags: ["ui"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "t-103",
    title: "Setup Supabase schema (future)",
    description: "Tasks, projects, users. Keep IDs stable.",
    status: "blocked",
    priority: "medium",
    tags: ["backend"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "t-104",
    title: "Ship the dashboard demo",
    description: "List view + Kanban with drag-and-drop.",
    status: "done",
    priority: "high",
    tags: ["ship"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];
