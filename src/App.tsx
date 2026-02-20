import { useEffect, useMemo, useState } from "react";
import type { Project, Task, TaskPriority, TaskStatus } from "./lib/types";
import { useDashboardRepo, useProjects, useTasks } from "./lib/store";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs",
        tone === "brand"
          ? "border-brand/20 bg-brand/10 text-brand"
          : "border-[color:var(--b)] bg-white text-[color:var(--m)]"
      )}
      style={
        tone === "brand"
          ? undefined
          : // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            ({ "--b": "rgba(15,23,42,0.10)", "--m": "#475569" } as any)
      }
    >
      {children}
    </span>
  );
}

const COLUMNS: Array<{ key: TaskStatus; name: string }> = [
  { key: "backlog", name: "Backlog" },
  { key: "in_progress", name: "In progress" },
  { key: "blocked", name: "Blocked" },
  { key: "done", name: "Done" },
];

function statusIndex(s: TaskStatus) {
  return COLUMNS.findIndex((c) => c.key === s);
}

function moveStatus(status: TaskStatus, dir: "left" | "right"): TaskStatus {
  const i = statusIndex(status);
  const next = dir === "left" ? i - 1 : i + 1;
  const clamped = Math.max(0, Math.min(COLUMNS.length - 1, next));
  return COLUMNS[clamped].key;
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="text-sm font-semibold text-text">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[color:var(--border)] bg-bg px-3 py-2 text-xs text-muted hover:bg-white"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Sidebar({
  projects,
  activeProjectId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: {
  projects: Project[];
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-[color:var(--border)] bg-surface p-5 lg:block">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[linear-gradient(135deg,#2563EB,#7C3AED)] text-white font-bold">
          PD
        </div>
        <div>
          <div className="text-sm font-semibold text-text">Project Dashboard</div>
          <div className="text-xs text-muted">Projects + tasks (mock)</div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="text-xs font-semibold text-text">Projects</div>
        <button
          onClick={onAdd}
          className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90"
        >
          + Add
        </button>
      </div>

      <div className="mt-3 grid gap-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className={cn(
              "rounded-xl border border-[color:var(--border)] bg-bg p-3",
              p.id === activeProjectId && "border-brand/30 bg-brand/5"
            )}
          >
            <button
              onClick={() => onSelect(p.id)}
              className="w-full text-left"
              title={p.name}
            >
              <div className="truncate text-sm font-semibold text-text">{p.name}</div>
              <div className="mt-1 text-xs text-muted">Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
            </button>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onRename(p.id)}
                className="rounded-lg border border-[color:var(--border)] bg-surface px-3 py-2 text-xs text-muted hover:bg-white"
              >
                Rename
              </button>
              <button
                onClick={() => onDelete(p.id)}
                className="rounded-lg border border-[color:var(--border)] bg-surface px-3 py-2 text-xs text-bad hover:bg-white"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-bg p-4 text-xs text-muted">
            No projects yet.
          </div>
        ) : null}
      </div>

      <div className="mt-10 rounded-2xl border border-[color:var(--border)] bg-bg p-4">
        <div className="text-xs font-semibold text-text">Supabase-ready</div>
        <div className="mt-1 text-xs text-muted">
          Repo interface keeps the UI clean—swap mock → Supabase with minimal refactor.
        </div>
      </div>

      <div className="mt-10 text-xs text-muted">Stanley Labs</div>
    </aside>
  );
}

function TaskForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    tags: string;
  };
  onSubmit: (x: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    tags: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [priority, setPriority] = useState<TaskPriority>(initial.priority);
  const [status, setStatus] = useState<TaskStatus>(initial.status);
  const [tags, setTags] = useState(initial.tags);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          tags: tags
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        });
      }}
    >
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-muted">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 rounded-xl border border-[color:var(--border)] bg-bg px-4 text-sm text-text outline-none ring-brand/30 focus:ring-2"
          placeholder="Ship onboarding flow"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-muted">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-24 rounded-xl border border-[color:var(--border)] bg-bg p-4 text-sm text-text outline-none ring-brand/30 focus:ring-2"
          placeholder="What does success look like?"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold text-muted">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="h-11 rounded-xl border border-[color:var(--border)] bg-bg px-4 text-sm text-text outline-none ring-brand/30 focus:ring-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold text-muted">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="h-11 rounded-xl border border-[color:var(--border)] bg-bg px-4 text-sm text-text outline-none ring-brand/30 focus:ring-2"
          >
            {COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-muted">Tags (comma-separated)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="h-11 rounded-xl border border-[color:var(--border)] bg-bg px-4 text-sm text-text outline-none ring-brand/30 focus:ring-2"
          placeholder="ui, backend, planning"
        />
      </label>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[color:var(--border)] bg-surface px-4 py-2 text-sm font-semibold text-muted hover:bg-bg"
        >
          Cancel
        </button>
        <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
          Save
        </button>
      </div>
    </form>
  );
}

function KanbanCard({
  task,
  onMove,
  onEdit,
  onDelete,
}: {
  task: Task;
  onMove: (dir: "left" | "right") => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex h-[168px] flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 overflow-hidden">
            <Pill tone="brand">{task.priority.toUpperCase()}</Pill>
            {task.tags?.slice(0, 2).map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
          <div className="mt-2 line-clamp-2 text-sm font-semibold text-text">{task.title}</div>
          {task.description ? <div className="mt-1 line-clamp-2 text-xs text-muted">{task.description}</div> : null}
        </div>
        <div className="shrink-0 rounded-full border border-[color:var(--border)] bg-bg px-3 py-2 text-xs text-muted">
          {task.assignee?.initials ?? "—"}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3">
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-[color:var(--border)] bg-bg px-3 py-2 text-xs text-muted hover:bg-white"
            onClick={() => onMove("left")}
            type="button"
            title="Move left"
          >
            ←
          </button>
          <button
            className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90"
            onClick={() => onMove("right")}
            type="button"
            title="Move right"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-[color:var(--border)] bg-surface px-3 py-2 text-xs text-muted hover:bg-bg"
            onClick={onEdit}
            type="button"
          >
            Edit
          </button>
          <button
            className="rounded-lg border border-[color:var(--border)] bg-surface px-3 py-2 text-xs text-bad hover:bg-bg"
            onClick={onDelete}
            type="button"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanView({
  tasks,
  onMove,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onMove: (id: string, dir: "left" | "right") => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {COLUMNS.map((c) => (
        <div key={c.key} className="rounded-2xl border border-[color:var(--border)] bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-text">{c.name}</div>
            <div className="text-xs text-muted">{byStatus[c.key].length}</div>
          </div>
          <div className="mt-4 grid gap-3">
            {byStatus[c.key].map((t) => (
              <KanbanCard
                key={t.id}
                task={t}
                onMove={(dir) => onMove(t.id, dir)}
                onEdit={() => onEdit(t)}
                onDelete={() => onDelete(t)}
              />
            ))}
            {byStatus[c.key].length === 0 ? (
              <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-bg p-4 text-xs text-muted">
                No tasks
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const repo = useDashboardRepo();
  const projectsApi = useProjects(repo);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const tasksApi = useTasks(repo, activeProjectId);

  const [view, setView] = useState<"list" | "kanban">("kanban");

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<"create" | "rename">("create");
  const [projectName, setProjectName] = useState("");
  const [projectTargetId, setProjectTargetId] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [taskTarget, setTaskTarget] = useState<Task | null>(null);

  useEffect(() => {
    projectsApi.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!projectsApi.projects || projectsApi.projects.length === 0) return;
    if (activeProjectId) return;
    setActiveProjectId(projectsApi.projects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsApi.projects]);

  useEffect(() => {
    tasksApi.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || !e.shiftKey) return;
      if (e.key.toLowerCase() === "k") setView("kanban");
      if (e.key.toLowerCase() === "l") setView("list");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function onMove(id: string, dir: "left" | "right") {
    const t = tasksApi.tasks?.find((x) => x.id === id);
    if (!t) return;
    const next = moveStatus(t.status, dir);
    await tasksApi.setStatus(id, next);
  }

  const activeProject = projectsApi.projects?.find((p) => p.id === activeProjectId) ?? null;

  function openCreateProject() {
    setProjectModalMode("create");
    setProjectName("");
    setProjectTargetId(null);
    setProjectModalOpen(true);
  }

  function openRenameProject(id: string) {
    const p = projectsApi.projects?.find((x) => x.id === id);
    setProjectModalMode("rename");
    setProjectName(p?.name ?? "");
    setProjectTargetId(id);
    setProjectModalOpen(true);
  }

  async function submitProject() {
    if (projectModalMode === "create") {
      const p = await projectsApi.create(projectName);
      setActiveProjectId(p.id);
    } else if (projectTargetId) {
      await projectsApi.rename(projectTargetId, projectName);
    }
    setProjectModalOpen(false);
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project and its tasks?")) return;
    await projectsApi.remove(id);
    if (activeProjectId === id) {
      const next = (projectsApi.projects ?? []).filter((p) => p.id !== id)[0];
      setActiveProjectId(next?.id ?? null);
    }
  }

  function openCreateTask() {
    if (!activeProjectId) return;
    setTaskModalMode("create");
    setTaskTarget(null);
    setTaskModalOpen(true);
  }

  function openEditTask(t: Task) {
    setTaskModalMode("edit");
    setTaskTarget(t);
    setTaskModalOpen(true);
  }

  async function submitTask(x: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    tags: string[];
  }) {
    if (!activeProjectId) return;
    if (taskModalMode === "create") {
      await tasksApi.create({
        projectId: activeProjectId,
        title: x.title,
        description: x.description || undefined,
        priority: x.priority,
        status: x.status,
        tags: x.tags,
        assignee: { name: "Ken", initials: "KS" },
      });
    } else if (taskTarget) {
      await tasksApi.update(taskTarget.id, {
        title: x.title,
        description: x.description || undefined,
        priority: x.priority,
        status: x.status,
        tags: x.tags,
      });
    }

    setTaskModalOpen(false);
  }

  async function deleteTask(t: Task) {
    if (!confirm("Delete this task?")) return;
    await tasksApi.remove(t.id);
  }

  return (
    <div className="min-h-dvh" style={{ "--border": "rgba(15, 23, 42, 0.10)" } as any}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
        <Sidebar
          projects={projectsApi.projects ?? []}
          activeProjectId={activeProjectId}
          onSelect={(id) => setActiveProjectId(id)}
          onAdd={openCreateProject}
          onRename={openRenameProject}
          onDelete={deleteProject}
        />

        <div className="flex min-h-dvh flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-bg/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
              <div>
                <div className="text-sm font-semibold text-text">{activeProject ? activeProject.name : "Tasks"}</div>
                <div className="text-xs text-muted">Mock data now • ready for Supabase later</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-xl border border-[color:var(--border)] bg-surface p-1">
                  {(["kanban", "list"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setView(k)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-semibold transition",
                        view === k ? "bg-bg text-text" : "text-muted hover:text-text"
                      )}
                    >
                      {k === "kanban" ? "Kanban" : "List"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => tasksApi.refresh()}
                  className="rounded-xl border border-[color:var(--border)] bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-bg"
                >
                  Refresh
                </button>
                <button
                  onClick={openCreateTask}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                >
                  New task
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
            {projectsApi.loading ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-6 text-sm text-muted shadow-card">
                Loading projects…
              </div>
            ) : projectsApi.error ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-6 text-sm text-bad shadow-card">
                {projectsApi.error}
              </div>
            ) : !activeProjectId ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-6 text-sm text-muted shadow-card">
                Create a project to begin.
              </div>
            ) : tasksApi.loading ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-6 text-sm text-muted shadow-card">
                Loading tasks…
              </div>
            ) : tasksApi.error ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-6 text-sm text-bad shadow-card">
                {tasksApi.error}
              </div>
            ) : tasksApi.tasks ? (
              view === "list" ? (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface shadow-card">
                  <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[color:var(--border)] px-5 py-3 text-xs font-semibold text-muted sm:grid-cols-[1fr_160px_120px_160px]">
                    <div>Task</div>
                    <div className="hidden sm:block">Status</div>
                    <div className="hidden sm:block">Priority</div>
                    <div className="hidden sm:block">Assignee</div>
                    <div className="sm:hidden">Info</div>
                  </div>
                  <div className="divide-y divide-[color:var(--border)]">
                    {tasksApi.tasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openEditTask(t)}
                        className="w-full text-left hover:bg-bg"
                      >
                        <div className="px-5 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold text-text">{t.title}</div>
                              {t.description ? <div className="mt-1 text-xs text-muted">{t.description}</div> : null}
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Pill tone="brand">{t.status.replace("_", " ")}</Pill>
                                <Pill>{t.priority}</Pill>
                                {(t.tags ?? []).slice(0, 3).map((x) => (
                                  <Pill key={x}>{x}</Pill>
                                ))}
                              </div>
                            </div>
                            <div className="text-xs text-muted">{t.assignee?.name ?? "—"}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <KanbanView
                  tasks={tasksApi.tasks}
                  onMove={onMove}
                  onEdit={openEditTask}
                  onDelete={deleteTask}
                />
              )
            ) : null}

            <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-surface p-5 text-sm text-muted shadow-card">
              Next upgrade: drag-and-drop Kanban, auth, realtime updates via Supabase.
            </div>
          </main>

          <footer className="border-t border-[color:var(--border)] py-10">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted">
                  <div className="font-semibold text-text">Project Dashboard</div>
                  <div className="mt-1">Clean SaaS layout sample.</div>
                  <div className="mt-2 text-xs text-muted">Stanley Labs</div>
                </div>
                <div className="text-xs text-muted">v0 demo</div>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <Modal
        open={projectModalOpen}
        title={projectModalMode === "create" ? "New project" : "Rename project"}
        onClose={() => setProjectModalOpen(false)}
      >
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-xs font-semibold text-muted">Project name</span>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="h-11 rounded-xl border border-[color:var(--border)] bg-bg px-4 text-sm text-text outline-none ring-brand/30 focus:ring-2"
              placeholder="Client portal"
              autoFocus
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setProjectModalOpen(false)}
              className="rounded-xl border border-[color:var(--border)] bg-surface px-4 py-2 text-sm font-semibold text-muted hover:bg-bg"
            >
              Cancel
            </button>
            <button onClick={submitProject} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={taskModalOpen}
        title={taskModalMode === "create" ? "New task" : "Edit task"}
        onClose={() => setTaskModalOpen(false)}
      >
        <TaskForm
          initial={{
            title: taskTarget?.title ?? "",
            description: taskTarget?.description ?? "",
            priority: taskTarget?.priority ?? "medium",
            status: taskTarget?.status ?? "backlog",
            tags: (taskTarget?.tags ?? []).join(", "),
          }}
          onCancel={() => setTaskModalOpen(false)}
          onSubmit={submitTask}
        />
        {taskModalMode === "edit" && taskTarget ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-bg p-3">
            <div className="text-xs text-muted">Danger zone</div>
            <button
              onClick={() => {
                void deleteTask(taskTarget);
                setTaskModalOpen(false);
              }}
              className="rounded-lg bg-bad px-3 py-2 text-xs font-semibold text-white hover:bg-bad/90"
            >
              Delete task
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
