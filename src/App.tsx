import { useEffect, useMemo, useState } from "react";
import { TaskCard } from "./components/TaskCard";
import type { Task, TaskStatus } from "./lib/types";
import { useTaskRepo, useTasks } from "./lib/store";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">{children}</div>;
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

function TopNav({
  view,
  setView,
}: {
  view: "list" | "kanban";
  setView: (v: "list" | "kanban") => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/70 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-graphite shadow-insetHairline">
              <span className="font-mono text-xs text-fog">PD</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-sm tracking-[0.18em] text-paper">
                PROJECT DASHBOARD
              </div>
              <div className="font-mono text-[11px] text-fog/80">List + Kanban (mock data)</div>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 shadow-insetHairline">
            {(["list", "kanban"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  view === k ? "bg-white/10 text-paper" : "text-fog hover:text-paper"
                )}
              >
                {k === "list" ? "List" : "Kanban"}
              </button>
            ))}
          </div>
        </div>
      </Container>
    </header>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-fog/80">
      {children}
    </span>
  );
}

function ListView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-insetHairline">
      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs font-mono text-fog/70 sm:grid-cols-[1fr_140px_120px_140px]">
        <div>Task</div>
        <div className="hidden sm:block">Status</div>
        <div className="hidden sm:block">Priority</div>
        <div className="hidden sm:block">Assignee</div>
        <div className="sm:hidden">Info</div>
      </div>
      <div className="divide-y divide-white/10">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 text-sm sm:grid-cols-[1fr_140px_120px_140px]"
          >
            <div>
              <div className="font-display text-paper">{t.title}</div>
              {t.description ? <div className="mt-1 text-xs text-fog/75">{t.description}</div> : null}
              {t.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.tags.map((x) => (
                    <Pill key={x}>{x}</Pill>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="hidden sm:flex items-center">
              <Pill>{t.status.replace("_", " ")}</Pill>
            </div>
            <div className="hidden sm:flex items-center">
              <Pill>{t.priority}</Pill>
            </div>
            <div className="hidden sm:flex items-center">
              <Pill>{t.assignee?.name ?? "—"}</Pill>
            </div>

            <div className="sm:hidden flex items-center">
              <Pill>
                {t.status.replace("_", " ")} · {t.priority}
              </Pill>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanView({
  tasks,
  onMove,
}: {
  tasks: Task[];
  onMove: (id: string, dir: "left" | "right") => void;
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
        <div
          key={c.key}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-insetHairline"
        >
          <div className="flex items-center justify-between">
            <div className="font-display text-sm text-paper">{c.name}</div>
            <div className="font-mono text-xs text-fog/70">{byStatus[c.key].length}</div>
          </div>
          <div className="mt-4 grid gap-3">
            {byStatus[c.key].map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onMove={(dir) => onMove(t.id, dir)}
              />
            ))}
            {byStatus[c.key].length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-ink/40 p-4 text-xs text-fog/70">
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
  const repo = useTaskRepo();
  const { tasks, loading, error, refresh, setStatus } = useTasks(repo);
  const [view, setView] = useState<"list" | "kanban">("kanban");

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onMove(id: string, dir: "left" | "right") {
    const t = tasks?.find((x) => x.id === id);
    if (!t) return;
    const next = moveStatus(t.status, dir);
    await setStatus(id, next);
  }

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <TopNav view={view} setView={setView} />

      <main className="py-10 sm:py-14">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl text-paper sm:text-4xl">Tasks</h1>
              <p className="mt-2 max-w-2xl text-fog/85">
                Mock data now. Same repo interface can be swapped for Supabase later.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => refresh()}
                className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-paper hover:bg-white/10"
              >
                Refresh
              </button>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="rounded-md bg-electric px-4 py-2 text-sm font-semibold text-white hover:bg-electric/90"
              >
                New task
              </a>
            </div>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-fog/80 shadow-insetHairline">
                Loading tasks…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-hot shadow-insetHairline">
                {error}
              </div>
            ) : tasks ? (
              view === "list" ? (
                <ListView tasks={tasks} />
              ) : (
                <KanbanView tasks={tasks} onMove={onMove} />
              )
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-fog/80 shadow-insetHairline">
            Next upgrade: drag-and-drop Kanban + auth + realtime updates via Supabase.
          </div>
        </Container>
      </main>

      <footer className="border-t border-white/10 py-10">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-fog/80">
              <div className="font-display tracking-[0.18em] text-paper">PROJECT DASHBOARD</div>
              <div className="mt-1">List + Kanban · mock repo interface</div>
              <div className="mt-2 text-xs text-fog/60">Stanley Labs</div>
            </div>
            <div className="font-mono text-xs text-fog/70">v0 demo</div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
