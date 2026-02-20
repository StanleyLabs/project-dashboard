import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project, Task, TaskPriority, TaskStatus, ViewMode } from "./lib/types";
import { STATUS_COLUMNS, PRIORITY_CONFIG, PROJECT_COLORS } from "./lib/types";
import { useDashboardRepo, useProjects, useTasks } from "./lib/store";

/* ─── Utilities ─── */

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function stopProp(e: React.MouseEvent) {
  e.stopPropagation();
}

/* ─── Icons (inline SVG for zero deps) ─── */

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconKanban({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zm10 0h-4a1 1 0 00-1 1v8a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1z" />
    </svg>
  );
}

function IconList({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IconGrip({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function IconEdit({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconFolder({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function IconX({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconMenu({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

/* ─── Small UI Components ─── */

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium", config.bg, config.color)}>
      {config.label}
    </span>
  );
}

function StatusDot({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    backlog: "bg-gray-300",
    todo: "bg-blue-400",
    in_progress: "bg-amber-400",
    done: "bg-emerald-500",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", colors[status])} />;
}

function Avatar({ initials, color, size = "sm" }: { initials: string; color: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium text-white",
        size === "sm" ? "h-6 w-6 text-2xs" : "h-8 w-8 text-xs"
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-2xs font-medium text-gray-600">
      {children}
    </span>
  );
}

/* ─── Modal ─── */

function Modal({
  open,
  title,
  children,
  onClose,
  width = "max-w-lg",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={cn("w-full rounded-xl bg-white shadow-overlay animate-scale-in", width)}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <IconX />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Task Form ─── */

function TaskForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string };
  onSubmit: (v: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string[] }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [priority, setPriority] = useState<TaskPriority>(initial.priority);
  const [status, setStatus] = useState<TaskStatus>(initial.status);
  const [tags, setTags] = useState(initial.tags);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
        });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="What needs to be done?"
          required
          autoFocus
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="Add more detail…"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-700">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {STATUS_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-700">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700">Tags <span className="font-normal text-gray-400">(comma-separated)</span></span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="frontend, design, bug"
        />
      </label>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          Save Task
        </button>
      </div>
    </form>
  );
}

/* ─── Project Form ─── */

function ProjectForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: { name: string; description: string; color: string };
  onSubmit: (v: { name: string; description: string; color: string }) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState(initial.color);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), description: description.trim(), color });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700">Project name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="My new project"
          required
          autoFocus
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700">Description</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="What's this project about?"
        />
      </label>
      <div>
        <span className="mb-2 block text-xs font-medium text-gray-700">Color</span>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all",
                color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ─── Sidebar ─── */

function Sidebar({
  projects,
  activeId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  collapsed,
  onToggle,
}: {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:relative lg:z-auto lg:translate-x-0",
          collapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            T
          </div>
          <span className="text-sm font-semibold text-gray-900">Taskflow</span>
          <button onClick={onToggle} className="ml-auto rounded-md p-1 text-gray-400 hover:text-gray-600 lg:hidden">
            <IconX />
          </button>
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Projects</span>
            <button
              onClick={onAdd}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="New project"
            >
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {projects.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors cursor-pointer",
                  p.id === activeId
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => onSelect(p.id)}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded" style={{ backgroundColor: p.color + "20", color: p.color }}>
                  <IconFolder className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 truncate">{p.name}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={stopProp}>
                  <button
                    onClick={() => onEdit(p)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    title="Edit project"
                  >
                    <IconEdit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                    title="Delete project"
                  >
                    <IconTrash className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-gray-400">
                No projects yet.
                <br />
                Create one to get started.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="text-2xs text-gray-400">Built by Stanley Labs</div>
        </div>
      </aside>
    </>
  );
}

/* ─── Sortable Task Card (Kanban) ─── */

function SortableTaskCard({
  task,
  isActive,
  onEdit,
  onDelete,
}: {
  task: Task;
  isActive?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms ease",
    ...(isActive ? { visibility: "hidden" as const } : {}),
  };

  return (
    <div ref={setNodeRef} style={style} className={isActive ? "" : "animate-fade-in"}>
      <TaskCardInner task={task} onEdit={onEdit} onDelete={onDelete} dragProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function TaskCardInner({
  task,
  onEdit,
  onDelete,
  dragProps,
  overlay,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  dragProps?: Record<string, unknown>;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "group rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md",
        overlay && "shadow-lg ring-2 ring-brand-500/20"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          {...dragProps}
        >
          <IconGrip className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={stopProp}>
              <button onClick={onEdit} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <IconEdit className="h-3 w-3" />
              </button>
              <button onClick={onDelete} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <IconTrash className="h-3 w-3" />
              </button>
            </div>
          </div>
          {task.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">{task.description}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.tags?.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
          {task.assignee && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <Avatar initials={task.assignee.initials} color={task.assignee.color} />
              <span className="text-2xs text-gray-500">{task.assignee.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Kanban Column ─── */

function KanbanColumn({
  status,
  label,
  icon,
  tasks,
  activeTaskId,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: {
  status: TaskStatus;
  label: string;
  icon: string;
  tasks: Task[];
  activeTaskId: string | null;
  onAddTask: () => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <div className={cn(
      "flex min-w-0 flex-1 flex-col rounded-xl border transition-colors duration-150",
      isOver ? "bg-brand-50/50 border-brand-200" : "bg-gray-50 border-gray-200/80"
    )}>
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-60">{icon}</span>
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-2xs font-medium text-gray-600">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          title={`Add task to ${label}`}
        >
          <IconPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div ref={setNodeRef} className="flex-1 space-y-2 px-2 pb-2 min-h-[60px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTaskCard
              key={t.id}
              task={t}
              isActive={t.id === activeTaskId}
              onEdit={() => onEditTask(t)}
              onDelete={() => onDeleteTask(t)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Kanban Board ─── */

function KanbanBoard({
  tasks,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onReorder,
}: {
  tasks: Task[];
  onEditTask: (t: Task) => void;
  onDeleteTask: (t: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onReorder: (taskId: string, newStatus: TaskStatus, newIndex: number) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Build the "source of truth" columns from props
  const baseByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], done: [] };
    for (const t of tasks) map[t.status].push(t);
    for (const key of Object.keys(map) as TaskStatus[]) {
      map[key].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [tasks]);

  // Live preview state — mirrors baseByStatus but updates during drag
  const [liveColumns, setLiveColumns] = useState(baseByStatus);

  // Sync live state when tasks change from outside (create/delete/edit)
  useEffect(() => {
    setLiveColumns(baseByStatus);
  }, [baseByStatus]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Find which column an item id lives in within live state
  function findColumn(id: string): TaskStatus | null {
    if (typeof id === "string" && id.startsWith("column-")) {
      return id.replace("column-", "") as TaskStatus;
    }
    for (const [status, items] of Object.entries(liveColumns)) {
      if (items.some((t) => t.id === id)) return status as TaskStatus;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCol = findColumn(activeId);
    const overCol = findColumn(overId);
    if (!activeCol || !overCol) return;

    // Moving between columns
    if (activeCol !== overCol) {
      setLiveColumns((prev) => {
        const sourceItems = [...prev[activeCol]];
        const destItems = [...prev[overCol]];
        const activeIndex = sourceItems.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return prev;

        const [movedItem] = sourceItems.splice(activeIndex, 1);

        // Find insert index
        let insertIndex = destItems.length;
        if (!overId.startsWith("column-")) {
          const overIndex = destItems.findIndex((t) => t.id === overId);
          if (overIndex !== -1) insertIndex = overIndex;
        }

        destItems.splice(insertIndex, 0, { ...movedItem, status: overCol });

        return {
          ...prev,
          [activeCol]: sourceItems,
          [overCol]: destItems,
        };
      });
    } else {
      // Reordering within same column
      setLiveColumns((prev) => {
        const items = [...prev[activeCol]];
        const activeIndex = items.findIndex((t) => t.id === activeId);
        const overIndex = items.findIndex((t) => t.id === overId);
        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return prev;

        return {
          ...prev,
          [activeCol]: arrayMove(items, activeIndex, overIndex),
        };
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      // Cancelled — reset to base
      setLiveColumns(baseByStatus);
      return;
    }

    const activeId = active.id as string;

    // Find the final column and index from live state
    let finalStatus: TaskStatus | null = null;
    let finalIndex = 0;
    for (const [status, items] of Object.entries(liveColumns)) {
      const idx = items.findIndex((t) => t.id === activeId);
      if (idx !== -1) {
        finalStatus = status as TaskStatus;
        finalIndex = idx;
        break;
      }
    }

    if (!finalStatus) return;

    // Commit to the real store
    onReorder(activeId, finalStatus, finalIndex);
  }

  function handleDragCancel() {
    setActiveTask(null);
    setLiveColumns(baseByStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-4 gap-4 pb-4">
        {STATUS_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            status={col.key}
            label={col.label}
            icon={col.icon}
            tasks={liveColumns[col.key]}
            activeTaskId={activeTask?.id ?? null}
            onAddTask={() => onAddTask(col.key)}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask ? (
          <div className="w-[280px]">
            <TaskCardInner task={activeTask} onEdit={() => {}} onDelete={() => {}} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── List View ─── */

function ListView({
  tasks,
  onEditTask,
  onDeleteTask,
}: {
  tasks: Task[];
  onEditTask: (t: Task) => void;
  onDeleteTask: (t: Task) => void;
}) {
  const sorted = useMemo(() => {
    const order: Record<TaskStatus, number> = { in_progress: 0, todo: 1, backlog: 2, done: 3 };
    return [...tasks].sort((a, b) => order[a.status] - order[b.status] || a.order - b.order);
  }, [tasks]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-gray-400">
        <IconFolder className="mb-3 h-8 w-8" />
        <p className="text-sm font-medium">No tasks yet</p>
        <p className="mt-1 text-xs">Create a task to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="grid grid-cols-[1fr_120px_100px_140px_80px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-gray-500">
        <div>Task</div>
        <div>Status</div>
        <div>Priority</div>
        <div>Assignee</div>
        <div className="text-right">Actions</div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {sorted.map((t) => (
          <div
            key={t.id}
            className="group grid grid-cols-[1fr_120px_100px_140px_80px] items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
              {t.description && <p className="mt-0.5 truncate text-xs text-gray-500">{t.description}</p>}
              {t.tags && t.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {t.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot status={t.status} />
              <span className="text-xs text-gray-600">
                {STATUS_COLUMNS.find((c) => c.key === t.status)?.label}
              </span>
            </div>
            <div>
              <PriorityBadge priority={t.priority} />
            </div>
            <div>
              {t.assignee ? (
                <div className="flex items-center gap-1.5">
                  <Avatar initials={t.assignee.initials} color={t.assignee.color} />
                  <span className="truncate text-xs text-gray-600">{t.assignee.name}</span>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Unassigned</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEditTask(t)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Edit"
              >
                <IconEdit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDeleteTask(t)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                title="Delete"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── App ─── */

export default function App() {
  const repo = useDashboardRepo();
  const projectsApi = useProjects(repo);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const tasksApi = useTasks(repo, activeProjectId);

  const [view, setView] = useState<ViewMode>("kanban");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");

  // Project modal
  const [projectModal, setProjectModal] = useState<{ mode: "create" | "edit"; project?: Project } | null>(null);

  // Task modal
  const [taskModal, setTaskModal] = useState<{ mode: "create" | "edit"; task?: Task; defaultStatus?: TaskStatus } | null>(null);

  const activeProject = projectsApi.projects?.find((p) => p.id === activeProjectId) ?? null;

  // Init
  useEffect(() => {
    projectsApi.refresh();
  }, []);

  useEffect(() => {
    if (!projectsApi.projects?.length || activeProjectId) return;
    setActiveProjectId(projectsApi.projects[0].id);
  }, [projectsApi.projects]);

  useEffect(() => {
    tasksApi.refresh();
  }, [activeProjectId]);

  // Filter tasks by search
  const filteredTasks = useMemo(() => {
    if (!tasksApi.tasks) return [];
    if (!search.trim()) return tasksApi.tasks;
    const q = search.toLowerCase();
    return tasksApi.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [tasksApi.tasks, search]);

  // Task counts per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasksApi.tasks ?? []) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tasksApi.tasks]);

  const totalTasks = tasksApi.tasks?.length ?? 0;
  const doneTasks = statusCounts["done"] ?? 0;

  // Handlers
  const handleCreateProject = useCallback(async (data: { name: string; description: string; color: string }) => {
    const p = await projectsApi.create(data);
    setActiveProjectId(p.id);
    setProjectModal(null);
  }, [projectsApi]);

  const handleUpdateProject = useCallback(async (data: { name: string; description: string; color: string }) => {
    if (!projectModal?.project) return;
    await projectsApi.update(projectModal.project.id, data);
    setProjectModal(null);
  }, [projectsApi, projectModal]);

  const handleDeleteProject = useCallback(async (id: string) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    await projectsApi.remove(id);
    if (activeProjectId === id) {
      const next = (projectsApi.projects ?? []).filter((p) => p.id !== id)[0];
      setActiveProjectId(next?.id ?? null);
    }
  }, [projectsApi, activeProjectId]);

  const handleCreateTask = useCallback(async (data: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string[] }) => {
    if (!activeProjectId) return;
    const maxOrder = Math.max(0, ...(tasksApi.tasks ?? []).filter((t) => t.status === data.status).map((t) => t.order));
    await tasksApi.create({
      projectId: activeProjectId,
      title: data.title,
      description: data.description || undefined,
      priority: data.priority,
      status: data.status,
      tags: data.tags,
      order: maxOrder + 1,
      assignee: { name: "Ken Stanley", initials: "KS", color: "#6366F1" },
    });
    setTaskModal(null);
  }, [activeProjectId, tasksApi]);

  const handleUpdateTask = useCallback(async (data: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string[] }) => {
    if (!taskModal?.task) return;
    await tasksApi.update(taskModal.task.id, {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority,
      status: data.status,
      tags: data.tags,
    });
    setTaskModal(null);
  }, [tasksApi, taskModal]);

  const handleDeleteTask = useCallback(async (t: Task) => {
    if (!confirm("Delete this task?")) return;
    await tasksApi.remove(t.id);
    setTaskModal(null);
  }, [tasksApi]);

  const handleReorder = useCallback(async (taskId: string, newStatus: TaskStatus, newIndex: number) => {
    await tasksApi.reorder(taskId, newStatus, newIndex);
  }, [tasksApi]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={projectsApi.projects ?? []}
        activeId={activeProjectId}
        onSelect={setActiveProjectId}
        onAdd={() => setProjectModal({ mode: "create" })}
        onEdit={(p) => setProjectModal({ mode: "edit", project: p })}
        onDelete={handleDeleteProject}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          >
            <IconMenu />
          </button>

          {activeProject && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: activeProject.color + "20", color: activeProject.color }}>
                <IconFolder className="h-3.5 w-3.5" />
              </span>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">{activeProject.name}</h1>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="h-8 w-48 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  view === "kanban" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <IconKanban className="h-3.5 w-3.5" />
                Board
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <IconList className="h-3.5 w-3.5" />
                List
              </button>
            </div>

            {/* New task */}
            <button
              onClick={() => setTaskModal({ mode: "create", defaultStatus: "todo" })}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
            >
              <IconPlus className="h-3.5 w-3.5" />
              New Task
            </button>
          </div>
        </header>

        {/* Progress bar */}
        {activeProject && totalTasks > 0 && (
          <div className="border-b border-gray-200 bg-white px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-2xs font-medium text-gray-500">
                {doneTasks}/{totalTasks} done
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {!activeProjectId ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <IconFolder className="mb-4 h-12 w-12" />
              <p className="text-lg font-medium text-gray-600">Select or create a project</p>
              <p className="mt-1 text-sm">Your tasks will appear here</p>
              <button
                onClick={() => setProjectModal({ mode: "create" })}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <IconPlus className="h-4 w-4" />
                Create Project
              </button>
            </div>
          ) : tasksApi.loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
            </div>
          ) : view === "kanban" ? (
            <KanbanBoard
              tasks={filteredTasks}
              onEditTask={(t) => setTaskModal({ mode: "edit", task: t })}
              onDeleteTask={handleDeleteTask}
              onAddTask={(status) => setTaskModal({ mode: "create", defaultStatus: status })}
              onReorder={handleReorder}
            />
          ) : (
            <ListView
              tasks={filteredTasks}
              onEditTask={(t) => setTaskModal({ mode: "edit", task: t })}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </main>
      </div>

      {/* Project Modal */}
      <Modal
        open={!!projectModal}
        title={projectModal?.mode === "create" ? "New Project" : "Edit Project"}
        onClose={() => setProjectModal(null)}
      >
        {projectModal && (
          <ProjectForm
            initial={{
              name: projectModal.project?.name ?? "",
              description: projectModal.project?.description ?? "",
              color: projectModal.project?.color ?? PROJECT_COLORS[0],
            }}
            onSubmit={projectModal.mode === "create" ? handleCreateProject : handleUpdateProject}
            onCancel={() => setProjectModal(null)}
            submitLabel={projectModal.mode === "create" ? "Create Project" : "Save Changes"}
          />
        )}
      </Modal>

      {/* Task Modal */}
      <Modal
        open={!!taskModal}
        title={taskModal?.mode === "create" ? "New Task" : "Edit Task"}
        onClose={() => setTaskModal(null)}
      >
        {taskModal && (
          <>
            <TaskForm
              initial={{
                title: taskModal.task?.title ?? "",
                description: taskModal.task?.description ?? "",
                priority: taskModal.task?.priority ?? "medium",
                status: taskModal.task?.status ?? taskModal.defaultStatus ?? "todo",
                tags: (taskModal.task?.tags ?? []).join(", "),
              }}
              onSubmit={taskModal.mode === "create" ? handleCreateTask : handleUpdateTask}
              onCancel={() => setTaskModal(null)}
            />
            {taskModal.mode === "edit" && taskModal.task && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <span className="text-xs text-red-700">Delete this task permanently</span>
                <button
                  onClick={() => { handleDeleteTask(taskModal.task!); }}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
