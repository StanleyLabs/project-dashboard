import { useEffect, useMemo, useState } from "react";
import type { Task, TaskStatus } from "./lib/types";
import { useTaskRepo, useTasks } from "./lib/store";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs",
        tone === "brand"
          ? "border-brand/20 bg-brand/10 text-brand"
          : "border-[color:var(--b)] bg-white text-[color:var(--m)]"
      )}
      style={{
        // CSS vars for neutral
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ...(tone === "brand" ? {} : ({ "--b": "rgba(15,23,42,0.10)", "--m": "#475569" } as any)),
      }}
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

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-[color:var(--border)] px-5 py-4 sm:grid-cols-[1fr_160px_120px_160px]">
      <div>
        <div className="font-semibold text-text">{task.title}</div>
        {task.description ? <div className="mt-1 text-xs text-muted">{task.description}</div> : null}
        {task.tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {task.tags.map((x) => (
              <Pill key={x}>{x}</Pill>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden sm:block">
        <Pill tone="brand">{task.status.replace("_", " ")}</Pill>
      </div>
      <div className="hidden sm:block">
        <Pill>{task.priority}</Pill>
      </div>
      <div className="hidden sm:block">
        <Pill>{task.assignee?.name ?? "—"}</Pill>
      </div>

      <div className="sm:hidden">
        <Pill>
          {task.status.replace("_", " ")} · {task.priority}
        </Pill>
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  onMove,
}: {
  task: Task;
  onMove: (dir: "left" | "right") => void;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="brand">{task.priority.toUpperCase()}</Pill>
            {task.tags?.slice(0, 2).map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
          <div className="mt-2 font-semibold text-text">{task.title}</div>
          {task.description ? <div className="mt-1 text-xs text-muted">{task.description}</div> : null}
        </div>
        <div className="rounded-full border border-[color:var(--border)] bg-bg px-3 py-2 text-xs text-muted">
          {task.assignee?.initials ?? "—"}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          className="rounded-lg border border-[color:var(--border)] bg-bg px-3 py-2 text-xs text-muted hover:bg-white"
          onClick={() => onMove("left")}
          type="button"
        >
          ←
        </button>
        <button
          className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90"
          onClick={() => onMove("right")}
          type="button"
        >
          →
        </button>
      </div>
    </div>
  );
}

function KanbanView({ tasks, onMove }: { tasks: Task[]; onMove: (id: string, dir: "left" | "right") => void }) {
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
            <div className="font-semibold text-text">{c.name}</div>
            <div className="text-xs text-muted">{byStatus[c.key].length}</div>
          </div>
          <div className="mt-4 grid gap-3">
            {byStatus[c.key].map((t) => (
              <KanbanCard key={t.id} task={t} onMove={(dir) => onMove(t.id, dir)} />
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

function Sidebar({ view, setView }: { view: "list" | "kanban"; setView: (v: "list" | "kanban") => void }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[color:var(--border)] bg-surface p-5 lg:block">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[linear-gradient(135deg,#2563EB,#7C3AED)] text-white font-bold">
          PD
        </div>
        <div>
          <div className="text-sm font-semibold text-text">Project Dashboard</div>
          <div className="text-xs text-muted">List + Kanban (mock)</div>
        </div>
      </div>

      <nav className="mt-8 grid gap-2">
        <button
          onClick={() => setView("kanban")}
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3 text-sm",
            view === "kanban" ? "bg-brand/10 text-brand" : "text-muted hover:bg-bg"
          )}
        >
          <span>Kanban</span>
          <span className="text-xs">⇧⌘K</span>
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3 text-sm",
            view === "list" ? "bg-brand/10 text-brand" : "text-muted hover:bg-bg"
          )}
        >
          <span>List</span>
          <span className="text-xs">⇧⌘L</span>
        </button>
      </nav>

      <div className="mt-10 rounded-2xl border border-[color:var(--border)] bg-bg p-4">
        <div className="text-xs font-semibold text-text">Supabase-ready</div>
        <div className="mt-1 text-xs text-muted">
          Data access is behind a repo interface, so swapping from mock → Supabase is straightforward.
        </div>
      </div>

      <div className="mt-10 text-xs text-muted">Stanley Labs</div>
    </aside>
  );
}

export default function App() {
  const repo = useTaskRepo();
  const { tasks, loading, error, refresh, setStatus } = useTasks(repo);
  const [view, setView] = useState<"list" | "kanban">("kanban");

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const t = tasks?.find((x) => x.id === id);
    if (!t) return;
    const next = moveStatus(t.status, dir);
    await setStatus(id, next);
  }

  return (
    <div className="min-h-dvh" style={{ "--border": "rgba(15, 23, 42, 0.10)" } as any}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
        <Sidebar view={view} setView={setView} />

        <div className="flex-1">
          <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-bg/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
              <div>
                <div className="text-sm font-semibold text-text">Tasks</div>
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
                  onClick={() => refresh()}
                  className="rounded-xl border border-[color:var(--border)] bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-bg"
                >
                  Refresh
                </button>
                <button
                  onClick={() => void 0}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                >
                  New task
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
            {loading ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-6 text-sm text-muted shadow-card">
                Loading tasks…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface p-6 text-sm text-bad shadow-card">
                {error}
              </div>
            ) : tasks ? (
              view === "list" ? (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface shadow-card">
                  <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[color:var(--border)] px-5 py-3 text-xs font-semibold text-muted sm:grid-cols-[1fr_160px_120px_160px]">
                    <div>Task</div>
                    <div className="hidden sm:block">Status</div>
                    <div className="hidden sm:block">Priority</div>
                    <div className="hidden sm:block">Assignee</div>
                    <div className="sm:hidden">Info</div>
                  </div>
                  <div>
                    {tasks.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              ) : (
                <KanbanView tasks={tasks} onMove={onMove} />
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
    </div>
  );
}
