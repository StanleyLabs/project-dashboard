import type { Project, Task } from "./types";

function nowIso() {
  return new Date().toISOString();
}

export const MOCK_PROJECTS: Project[] = [
  { id: "p-001", name: "Website Redesign", createdAt: nowIso(), updatedAt: nowIso() },
  { id: "p-002", name: "Client Portal", createdAt: nowIso(), updatedAt: nowIso() },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "t-101",
    projectId: "p-001",
    title: "Define v1 scope",
    description: "Lock the must-haves and explicitly cut the rest.",
    status: "backlog",
    priority: "high",
    assignee: { name: "Ken", initials: "KS" },
    tags: ["planning"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "t-102",
    projectId: "p-001",
    title: "Draft homepage layout",
    description: "Hero → services → proof → CTA. Keep it tight.",
    status: "in_progress",
    priority: "medium",
    assignee: { name: "TARS", initials: "TA" },
    tags: ["ui"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "t-103",
    projectId: "p-002",
    title: "Design task data model (Supabase-ready)",
    description: "Projects, tasks, ordering, and RLS strategy.",
    status: "blocked",
    priority: "medium",
    tags: ["backend"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "t-104",
    projectId: "p-002",
    title: "Ship dashboard demo",
    description: "Add/edit/delete tasks + projects list.",
    status: "done",
    priority: "high",
    tags: ["ship"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];
