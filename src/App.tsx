import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme, type ThemeOption } from "./lib/theme";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
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

function collisionDetection(args: Parameters<typeof pointerWithin>[0]) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
}

const AVATAR_COLORS = ["#6c5ce7", "#e84393", "#00b894", "#fdcb6e", "#e17055", "#0984e3", "#6c5ce7", "#00cec9", "#d63031", "#a29bfe"];

function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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

/* ─── Theme Toggle ─── */

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler, true);
    };
  }, [open]);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }

  const options: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Light",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
    },
    {
      value: "dark",
      label: "Dark",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ),
    },
    {
      value: "system",
      label: "System",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
      ),
    },
  ];

  const current = options.find((o) => o.value === theme)!;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-raised p-1.5 text-gray-500 dark:text-gray-400 hover:bg-canvas dark:hover:bg-dark-border hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        title={`Theme: ${current.label}`}
      >
        {current.icon}
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          className="fixed w-36 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-overlay animate-fade-in overflow-hidden"
          style={{ top: pos.top, right: pos.right, zIndex: 9999 }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors",
                o.value === theme
                  ? "bg-accent/10 text-accent-dark dark:text-accent-light font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-canvas dark:hover:bg-dark-raised"
              )}
              onClick={() => { setTheme(o.value); setOpen(false); }}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

/* ─── Custom Select ─── */

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  renderOption,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  renderOption?: (opt: { value: T; label: string }, isSelected: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border bg-white dark:bg-dark-raised px-3 py-2 text-left text-sm transition-colors",
          open ? "border-accent ring-2 ring-accent/25" : "border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600"
        )}
      >
        <span className={selected ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>
          {selected && renderOption ? renderOption(selected, true) : (selected?.label ?? placeholder ?? "Select…")}
        </span>
        <svg className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-lifted animate-fade-in">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                o.value === value
                  ? "bg-accent/8 font-medium"
                  : "hover:bg-canvas dark:hover:bg-dark-raised"
              )}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {renderOption ? renderOption(o, o.value === value) : o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Small UI Components ─── */

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    urgent: "bg-pri-urgent/10 text-pri-urgent border-pri-urgent/20",
    high: "bg-pri-high/10 text-pri-high border-pri-high/20",
    medium: "bg-pri-medium/10 text-pri-medium border-pri-medium/20",
    low: "bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-gray-400 border-gray-200 dark:border-dark-border",
  };
  const config = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium", styles[priority])}>
      {config.label}
    </span>
  );
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
    <span className="inline-flex items-center rounded-md bg-accent/8 dark:bg-accent/15 px-1.5 py-0.5 text-2xs font-medium text-accent-dark dark:text-accent-light">
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
  const mouseDownOnOverlay = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) {
        (active as HTMLElement).blur();
        e.stopPropagation();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-sidebar/60 backdrop-blur-sm px-4 pt-[15vh] animate-fade-in"
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === overlayRef.current; }}
      onMouseUp={(e) => {
        if (mouseDownOnOverlay.current && e.target === overlayRef.current) onClose();
        mouseDownOnOverlay.current = false;
      }}
    >
      <div className={cn("w-full rounded-2xl bg-white dark:bg-dark-surface shadow-overlay animate-scale-in border border-gray-200 dark:border-dark-border", width)}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:bg-dark-border hover:text-gray-600 transition-colors">
            <IconX />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Task Form ─── */

type KnownAssignee = { name: string; initials: string; color: string };

function TaskForm({
  initial,
  knownAssignees,
  knownTags,
  onSubmit,
  onCancel,
}: {
  initial: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string[]; assignee: string; assigneeColor: string };
  knownAssignees: KnownAssignee[];
  knownTags: string[];
  onSubmit: (v: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string[]; assignee: string; assigneeColor: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [priority, setPriority] = useState<TaskPriority>(initial.priority);
  const [status, setStatus] = useState<TaskStatus>(initial.status);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagInput, setTagInput] = useState("");
  const [tagFocused, setTagFocused] = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);
  const [assignee, setAssignee] = useState(initial.assignee);
  const [assigneeColor, setAssigneeColor] = useState(initial.assigneeColor || AVATAR_COLORS[0]);
  const [assigneeFocused, setAssigneeFocused] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  // Filter known assignees by input
  const suggestions = useMemo(() => {
    if (!assignee.trim()) return knownAssignees;
    const q = assignee.toLowerCase();
    return knownAssignees.filter((a) => a.name.toLowerCase().includes(q));
  }, [assignee, knownAssignees]);

  const showSuggestions = assigneeFocused && suggestions.length > 0;

  // Tag suggestions
  const tagSuggestions = useMemo(() => {
    const available = knownTags.filter((t) => !tags.includes(t));
    if (!tagInput.trim()) return available;
    const q = tagInput.toLowerCase();
    return available.filter((t) => t.toLowerCase().includes(q));
  }, [tagInput, knownTags, tags]);

  const showTagSuggestions = tagFocused && tagSuggestions.length > 0;

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  // Close tag dropdown on outside click
  useEffect(() => {
    if (!showTagSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setTagFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTagSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  function selectAssignee(a: KnownAssignee) {
    setAssignee(a.name);
    setAssigneeColor(a.color);
    setAssigneeFocused(false);
  }

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
          tags,
          assignee: assignee.trim(),
          assigneeColor,
        });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          placeholder="What needs to be done?"
          required
          autoFocus
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="block w-full rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          placeholder="Add more detail…"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Status</span>
          <CustomSelect
            value={status}
            onChange={setStatus}
            options={STATUS_COLUMNS.map((c) => ({ value: c.key, label: c.label }))}
            renderOption={(opt) => {
              const col = STATUS_COLUMNS.find((c) => c.key === opt.value);
              return (
                <span className="flex items-center gap-2">
                  <span className="text-xs">{col?.icon}</span>
                  <span>{opt.label}</span>
                </span>
              );
            }}
          />
        </div>
        <div className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Priority</span>
          <CustomSelect
            value={priority}
            onChange={setPriority}
            options={[
              { value: "urgent" as TaskPriority, label: "Urgent" },
              { value: "high" as TaskPriority, label: "High" },
              { value: "medium" as TaskPriority, label: "Medium" },
              { value: "low" as TaskPriority, label: "Low" },
            ]}
            renderOption={(opt) => {
              const cfg = PRIORITY_CONFIG[opt.value as TaskPriority];
              return (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                  <span>{opt.label}</span>
                </span>
              );
            }}
          />
        </div>
      </div>
      <div className="block" ref={assigneeRef}>
        <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Assignee</span>
        <div className="flex items-center gap-2">
          {assignee.trim() && (
            <Avatar initials={nameToInitials(assignee)} color={assigneeColor} />
          )}
          <div className="relative flex-1">
            <input
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
              }}
              onFocus={() => setAssigneeFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && assigneeFocused) { e.stopPropagation(); setAssigneeFocused(false); (e.target as HTMLElement).blur(); }
              }}
              className="block w-full rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              placeholder="Type a name…"
            />
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-lifted animate-fade-in">
                {suggestions.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-canvas dark:hover:bg-dark-raised transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); selectAssignee(a); }}
                  >
                    <Avatar initials={a.initials} color={a.color} />
                    <span>{a.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {assignee.trim() && (
            <button
              type="button"
              onClick={() => { setAssignee(""); setAssigneeFocused(false); }}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600"
              title="Clear assignee"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {assignee.trim() && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-2xs text-gray-500 dark:text-gray-400">Color:</span>
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAssigneeColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  assigneeColor === c ? "border-sidebar scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>
      <div ref={tagRef} className="relative">
        <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Tags</span>
        <div
          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-raised px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 min-h-[38px] cursor-text"
          onClick={() => { tagRef.current?.querySelector("input")?.focus(); setTagFocused(true); }}
        >
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md bg-accent/8 dark:bg-accent/15 px-2 py-0.5 text-2xs font-medium text-accent-dark dark:text-accent-light">
              {t}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(t); }} className="text-accent-dark/50 hover:text-accent-dark">
                <IconX className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <div className="flex-1 min-w-[80px]">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onFocus={() => setTagFocused(true)}
              onClick={() => setTagFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.stopPropagation(); setTagFocused(false); (e.target as HTMLElement).blur(); return; }
                if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); addTag(tagInput); }
                if (e.key === "Backspace" && !tagInput && tags.length > 0) removeTag(tags[tags.length - 1]);
                if (e.key === "," && tagInput.trim()) { e.preventDefault(); addTag(tagInput); }
              }}
              className="w-full border-none bg-transparent py-0.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
              placeholder={tags.length === 0 ? "Type to add tags…" : ""}
            />
          </div>
        </div>
        {showTagSuggestions && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-lifted animate-fade-in">
            {tagSuggestions.slice(0, 8).map((t) => (
              <button
                key={t}
                type="button"
                className="flex w-full items-center px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-canvas dark:hover:bg-dark-raised transition-colors"
                onMouseDown={(e) => { e.preventDefault(); addTag(t); }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent/30"
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
        <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Project name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          placeholder="My new project"
          required
          autoFocus
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Description</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="block w-full rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          placeholder="What's this project about?"
        />
      </label>
      <div>
        <span className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Color</span>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all",
                color === c ? "border-sidebar scale-110 shadow-card" : "border-transparent hover:scale-105"
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
          className="rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ─── Sidebar ─── */

function SortableProjectItem({
  project,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 rounded-lg px-1 py-2 text-sm transition-colors cursor-pointer",
        isActive
          ? "bg-sidebar-active text-white"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
      )}
      onClick={onSelect}
    >
      <button
        className="shrink-0 cursor-grab rounded p-0.5 text-sidebar-muted/50 hover:text-sidebar-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={stopProp}
      >
        <IconGrip className="h-3 w-3" />
      </button>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
        style={{ backgroundColor: project.color + "30", color: project.color }}
      >
        <IconFolder className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 truncate">{project.name}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={stopProp}>
        <button
          onClick={onEdit}
          className="rounded p-1 text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
          title="Edit project"
        >
          <IconEdit className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-sidebar-muted hover:bg-red-500/20 hover:text-red-400"
          title="Delete project"
        >
          <IconTrash className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  projects,
  activeId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  collapsed,
  onToggle,
}: {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart() {
    document.body.classList.add("is-dragging");
  }

  function handleDragEnd(event: DragEndEvent) {
    document.body.classList.remove("is-dragging");
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(projects, oldIndex, newIndex);
    onReorder(reordered.map((p) => p.id));
  }

  return (
    <>
      {/* Mobile overlay — only on small screens */}
      {!collapsed && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-sidebar transition-all duration-200 lg:relative lg:z-auto",
          collapsed ? "-translate-x-full lg:ml-[-256px]" : "translate-x-0 lg:ml-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-glow overflow-hidden">
            <svg viewBox="0 0 1000 1000" className="h-full w-full">
              <rect width="1000" height="1000" rx="304" fill="#171717"/>
              <rect x="100" y="100" width="800" height="800" rx="220" fill="#0B0D10" stroke="#F2F4F7" strokeWidth="56"/>
              <path d="M270 720V300h130c40 0 72 10 96 30s36 48 36 84c0 36-12 64-36 84s-56 30-96 30H340v192H270zm70-252h56c26 0 46-6 60-20 14-14 22-32 22-54s-8-40-22-54c-14-14-34-20-60-20H340v148z" fill="#F2F4F7"/>
              <path d="M560 720V300h110c52 0 94 16 126 48s48 76 48 136c0 60-16 104-48 136s-74 48-126 48H560v52zm70-112h38c36 0 64-12 84-36s30-56 30-88c0-32-10-64-30-88s-48-36-84-36H630v248z" fill="#F2F4F7"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Project Dashboard</span>
          <button onClick={onToggle} className="ml-auto rounded-md p-1 text-sidebar-muted hover:text-white">
            <IconX />
          </button>
        </div>

        {/* Projects list */}
        <div className="dark-scroll flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">Projects</span>
            <button
              onClick={onAdd}
              className="rounded-md p-1 text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
              title="New project"
            >
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => document.body.classList.remove("is-dragging")}>
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {projects.map((p) => (
                  <SortableProjectItem
                    key={p.id}
                    project={p}
                    isActive={p.id === activeId}
                    onSelect={() => onSelect(p.id)}
                    onEdit={() => onEdit(p)}
                    onDelete={() => onDelete(p.id)}
                  />
                ))}
                {projects.length === 0 && (
                  <div className="px-2 py-6 text-center text-xs text-sidebar-muted">
                    No projects yet.
                    <br />
                    Create one to get started.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="text-2xs text-sidebar-muted">Built by Stanley Labs</div>
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
    <div ref={setNodeRef} style={style} data-task-id={task.id}>
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
        "group rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3.5 transition-all hover:shadow-lifted hover:border-gray-300",
        overlay && "shadow-lifted ring-2 ring-accent/25 border-accent/30"
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
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{task.title}</p>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={stopProp}>
              <button onClick={onEdit} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:bg-dark-border hover:text-gray-600 dark:text-gray-400">
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
              <span className="text-2xs text-gray-500 dark:text-gray-400">{task.assignee.name}</span>
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
  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex h-full min-w-0 flex-1 flex-col rounded-2xl border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised"
    >
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs">{icon}</span>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{label}</span>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200/80 dark:bg-dark-border px-1.5 text-2xs font-semibold text-gray-500 dark:text-gray-400">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-200/80 hover:text-gray-600 transition-colors"
          title={`Add task to ${label}`}
        >
          <IconPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 space-y-2 px-2 pt-3 pb-2 min-h-[60px]">
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
          <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-dark-border/80 text-xs text-gray-400">
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
  const [activeWidth, setActiveWidth] = useState<number | null>(null);

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
  const lastOverIdRef = useRef<string | null>(null);

  // Sync live state when tasks change from outside (create/delete/edit)
  useEffect(() => {
    setLiveColumns(baseByStatus);
  }, [baseByStatus]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findColumn(cols: Record<TaskStatus, Task[]>, id: string): TaskStatus | null {
    if (typeof id === "string" && id.startsWith("column-"))
      return id.replace("column-", "") as TaskStatus;
    for (const [status, items] of Object.entries(cols))
      if (items.some((t) => t.id === id)) return status as TaskStatus;
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    document.body.classList.add("is-dragging");
    lastOverIdRef.current = null;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
    const el = document.querySelector(`[data-task-id="${event.active.id}"]`);
    setActiveWidth(el instanceof HTMLElement ? el.getBoundingClientRect().width : null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      lastOverIdRef.current = null;
      return;
    }
    const activeId = active.id as string;
    const overId = over.id as string;
    if (overId === lastOverIdRef.current) return;
    lastOverIdRef.current = overId;

    setLiveColumns((prev) => {
      const activeCol = findColumn(prev, activeId);
      const overCol = findColumn(prev, overId);
      if (!activeCol || !overCol) return prev;

      if (activeCol !== overCol) {
        const src = [...prev[activeCol]];
        const dst = [...prev[overCol]];
        const ai = src.findIndex((t) => t.id === activeId);
        if (ai === -1) return prev;
        const [movedItem] = src.splice(ai, 1);
        let ins = dst.length;
        if (!overId.startsWith("column-")) {
          const oi = dst.findIndex((t) => t.id === overId);
          if (oi !== -1) ins = oi;
        }
        dst.splice(ins, 0, { ...movedItem, status: overCol });
        return { ...prev, [activeCol]: src, [overCol]: dst };
      } else {
        const items = [...prev[activeCol]];
        const ai = items.findIndex((t) => t.id === activeId);
        const oi = items.findIndex((t) => t.id === overId);
        if (ai === -1 || oi === -1 || ai === oi) return prev;
        return { ...prev, [activeCol]: arrayMove(items, ai, oi) };
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    document.body.classList.remove("is-dragging");
    lastOverIdRef.current = null;
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
    document.body.classList.remove("is-dragging");
    lastOverIdRef.current = null;
    setActiveTask(null);
    setLiveColumns(baseByStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-w-0 overflow-x-auto kanban-scroll">
        <div className="flex gap-4 pb-4 w-max min-w-full lg:w-full">
          {STATUS_COLUMNS.map((col) => (
          <div key={col.key} className="min-w-[272px] w-[272px] shrink-0 lg:min-w-0 lg:w-auto lg:flex-1">
            <KanbanColumn
              status={col.key}
              label={col.label}
              icon={col.icon}
              tasks={liveColumns[col.key]}
              activeTaskId={activeTask?.id ?? null}
              onAddTask={() => onAddTask(col.key)}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          </div>
        ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask ? (
          <div style={activeWidth ? { width: activeWidth } : { width: 280 }}>
            <TaskCardInner task={activeTask} onEdit={() => {}} onDelete={() => {}} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── List View (Sortable Row) ─── */

function SortableListRow({
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
    <div
      ref={setNodeRef}
      style={style}
      data-task-id={task.id}
      className="group border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-raised"
    >
      {/* Desktop: grid layout */}
      <div className="hidden sm:grid sm:grid-cols-[20px_1fr_100px_140px_80px] sm:items-center sm:gap-3">
        <button
          className="cursor-grab rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <IconGrip className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
          {task.description && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{task.description}</p>}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}
            </div>
          )}
        </div>
        <div>
          <PriorityBadge priority={task.priority} />
        </div>
        <div>
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar initials={task.assignee.initials} color={task.assignee.color} />
              <span className="truncate text-xs text-gray-600 dark:text-gray-400">{task.assignee.name}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:bg-dark-border hover:text-gray-600"
            title="Edit"
          >
            <IconEdit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {/* Mobile: stacked layout */}
      <div className="flex items-start gap-2 sm:hidden">
        <button
          className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <IconGrip className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{task.title}</p>
            <div className="flex shrink-0 items-center gap-0.5">
              <button onClick={onEdit} className="rounded-md p-1 text-gray-400 hover:text-gray-600"><IconEdit className="h-3.5 w-3.5" /></button>
              <button onClick={onDelete} className="rounded-md p-1 text-gray-400 hover:text-red-500"><IconTrash className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {task.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.tags?.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}
            {task.assignee && (
              <div className="flex items-center gap-1 ml-auto">
                <Avatar initials={task.assignee.initials} color={task.assignee.color} />
                <span className="text-2xs text-gray-500">{task.assignee.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListOverlayRow({ task }: { task: Task }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-white dark:bg-dark-surface px-4 py-3 shadow-lifted ring-2 ring-accent/20">
      <div className="flex items-start gap-2">
        <IconGrip className="h-3.5 w-3.5 mt-0.5 text-gray-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
          {task.description && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.assignee && (
              <div className="flex items-center gap-1.5">
                <Avatar initials={task.assignee.initials} color={task.assignee.color} />
                <span className="text-2xs text-gray-600 dark:text-gray-400">{task.assignee.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListStatusGroup({
  status,
  label,
  icon,
  tasks,
  activeTaskId,
  onEditTask,
  onDeleteTask,
}: {
  status: TaskStatus;
  label: string;
  icon: string;
  tasks: Task[];
  activeTaskId: string | null;
  onEditTask: (t: Task) => void;
  onDeleteTask: (t: Task) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: `list-group-${status}`,
    data: { type: "list-group", status },
  });

  return (
    <div
      ref={setNodeRef}
      className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface"
    >
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-dark-border bg-raised dark:bg-dark-raised px-4 py-2.5">
        <span className="text-xs">{icon}</span>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{label}</span>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200/80 dark:bg-dark-border px-1.5 text-2xs font-semibold text-gray-500 dark:text-gray-400">
          {tasks.length}
        </span>
      </div>
      <div className="min-h-[48px] pt-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableListRow
              key={t.id}
              task={t}
              isActive={t.id === activeTaskId}
              onEdit={() => onEditTask(t)}
              onDelete={() => onDeleteTask(t)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex h-12 items-center justify-center text-xs text-gray-400">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

function ListView({
  tasks,
  onEditTask,
  onDeleteTask,
  onReorder,
}: {
  tasks: Task[];
  onEditTask: (t: Task) => void;
  onDeleteTask: (t: Task) => void;
  onReorder: (taskId: string, newStatus: TaskStatus, newIndex: number) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);

  const baseByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], done: [] };
    for (const t of tasks) map[t.status].push(t);
    for (const key of Object.keys(map) as TaskStatus[]) {
      map[key].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [tasks]);

  const [liveColumns, setLiveColumns] = useState(baseByStatus);
  const lastOverIdRef = useRef<string | null>(null);
  useEffect(() => { setLiveColumns(baseByStatus); }, [baseByStatus]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findColumn(cols: Record<TaskStatus, Task[]>, id: string): TaskStatus | null {
    if (typeof id === "string" && id.startsWith("list-group-"))
      return id.replace("list-group-", "") as TaskStatus;
    for (const [status, items] of Object.entries(cols))
      if (items.some((t) => t.id === id)) return status as TaskStatus;
    return null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      lastOverIdRef.current = null;
      return;
    }
    const activeId = active.id as string;
    const overId = over.id as string;
    if (overId === lastOverIdRef.current) return;
    lastOverIdRef.current = overId;

    setLiveColumns((prev) => {
      const activeCol = findColumn(prev, activeId);
      const overCol = findColumn(prev, overId);
      if (!activeCol || !overCol) return prev;

      if (activeCol !== overCol) {
        const src = [...prev[activeCol]];
        const dst = [...prev[overCol]];
        const ai = src.findIndex((t) => t.id === activeId);
        if (ai === -1) return prev;
        const [moved] = src.splice(ai, 1);
        let ins = dst.length;
        if (!overId.startsWith("list-group-")) {
          const oi = dst.findIndex((t) => t.id === overId);
          if (oi !== -1) ins = oi;
        }
        dst.splice(ins, 0, { ...moved, status: overCol });
        return { ...prev, [activeCol]: src, [overCol]: dst };
      } else {
        const items = [...prev[activeCol]];
        const ai = items.findIndex((t) => t.id === activeId);
        const oi = items.findIndex((t) => t.id === overId);
        if (ai === -1 || oi === -1 || ai === oi) return prev;
        return { ...prev, [activeCol]: arrayMove(items, ai, oi) };
      }
    });
  }

  function handleDragStart(event: DragStartEvent) {
    document.body.classList.add("is-dragging");
    lastOverIdRef.current = null;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
    const el = document.querySelector(`[data-task-id="${event.active.id}"]`);
    setActiveWidth(el instanceof HTMLElement ? el.getBoundingClientRect().width : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    document.body.classList.remove("is-dragging");
    lastOverIdRef.current = null;
    const { active, over } = event;
    setActiveTask(null);
    if (!over) { setLiveColumns(baseByStatus); return; }
    const activeId = active.id as string;
    for (const [status, items] of Object.entries(liveColumns)) {
      const idx = items.findIndex((t) => t.id === activeId);
      if (idx !== -1) { onReorder(activeId, status as TaskStatus, idx); return; }
    }
  }

  function handleDragCancel() {
    document.body.classList.remove("is-dragging");
    lastOverIdRef.current = null;
    setActiveTask(null);
    setLiveColumns(baseByStatus);
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-dark-border py-16 text-gray-400">
        <IconFolder className="mb-3 h-8 w-8" />
        <p className="text-sm font-medium">No tasks yet</p>
        <p className="mt-1 text-xs">Create a task to get started</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        {STATUS_COLUMNS.map((col) => (
          <ListStatusGroup
            key={col.key}
            status={col.key}
            label={col.label}
            icon={col.icon}
            tasks={liveColumns[col.key]}
            activeTaskId={activeTask?.id ?? null}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask ? (
          <div style={activeWidth ? { width: activeWidth } : undefined}>
            <ListOverlayRow task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── Confirm Dialog ─── */

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-sidebar/60 backdrop-blur-sm px-4 pt-[20vh] animate-fade-in"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-dark-surface shadow-overlay animate-scale-in border border-gray-200 dark:border-dark-border">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
              <IconTrash className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 dark:border-dark-border bg-raised dark:bg-dark-raised px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [search, setSearch] = useState("");

  // Project modal
  const [projectModal, setProjectModal] = useState<{ mode: "create" | "edit"; project?: Project } | null>(null);

  // Task modal
  const [taskModal, setTaskModal] = useState<{ mode: "create" | "edit"; task?: Task; defaultStatus?: TaskStatus } | null>(null);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

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

  // Deduplicated list of all known assignees across ALL projects
  const [allAssignees, setAllAssignees] = useState<KnownAssignee[]>([]);
  const refreshAssignees = useCallback(async () => {
    const all = await repo.listAllTasks();
    const map = new Map<string, KnownAssignee>();
    for (const t of all) {
      if (t.assignee && !map.has(t.assignee.name)) {
        map.set(t.assignee.name, { name: t.assignee.name, initials: t.assignee.initials, color: t.assignee.color });
      }
    }
    setAllAssignees(Array.from(map.values()));
  }, [repo]);

  // Refresh assignees when tasks change
  useEffect(() => { refreshAssignees(); }, [tasksApi.tasks, refreshAssignees]);

  // All known tags across all projects
  const [allTags, setAllTags] = useState<string[]>([]);
  const refreshTags = useCallback(async () => {
    const all = await repo.listAllTasks();
    const tagSet = new Set<string>();
    for (const t of all) {
      for (const tag of t.tags ?? []) tagSet.add(tag);
    }
    setAllTags(Array.from(tagSet).sort());
  }, [repo]);
  useEffect(() => { refreshTags(); }, [tasksApi.tasks, refreshTags]);

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

  const handleDeleteProject = useCallback((id: string) => {
    const project = projectsApi.projects?.find((p) => p.id === id);
    setConfirmDialog({
      title: "Delete project",
      message: `"${project?.name ?? "This project"}" and all its tasks will be permanently deleted.`,
      confirmLabel: "Delete Project",
      onConfirm: async () => {
        setConfirmDialog(null);
        await projectsApi.remove(id);
        if (activeProjectId === id) {
          const next = (projectsApi.projects ?? []).filter((p) => p.id !== id)[0];
          setActiveProjectId(next?.id ?? null);
        }
      },
    });
  }, [projectsApi, activeProjectId]);

  // Sync a person's color across all tasks with the same assignee name
  const syncAssigneeColor = useCallback(async (name: string, color: string) => {
    for (const t of tasksApi.tasks ?? []) {
      if (t.assignee && t.assignee.name === name && t.assignee.color !== color) {
        await tasksApi.update(t.id, { assignee: { ...t.assignee, color } });
      }
    }
  }, [tasksApi]);

  const handleCreateTask = useCallback(async (data: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string[]; assignee: string; assigneeColor: string }) => {
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
      assignee: data.assignee
        ? { name: data.assignee, initials: nameToInitials(data.assignee), color: data.assigneeColor }
        : undefined,
    });
    if (data.assignee) await syncAssigneeColor(data.assignee, data.assigneeColor);
    setTaskModal(null);
  }, [activeProjectId, tasksApi, syncAssigneeColor]);

  const handleUpdateTask = useCallback(async (data: { title: string; description: string; priority: TaskPriority; status: TaskStatus; tags: string[]; assignee: string; assigneeColor: string }) => {
    if (!taskModal?.task) return;
    await tasksApi.update(taskModal.task.id, {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority,
      status: data.status,
      tags: data.tags,
      assignee: data.assignee
        ? { name: data.assignee, initials: nameToInitials(data.assignee), color: data.assigneeColor }
        : undefined,
    });
    if (data.assignee) await syncAssigneeColor(data.assignee, data.assigneeColor);
    setTaskModal(null);
  }, [tasksApi, taskModal, syncAssigneeColor]);

  const handleDeleteTask = useCallback((t: Task) => {
    setConfirmDialog({
      title: "Delete task",
      message: `"${t.title}" will be permanently deleted.`,
      confirmLabel: "Delete Task",
      onConfirm: async () => {
        setConfirmDialog(null);
        await tasksApi.remove(t.id);
        setTaskModal(null);
      },
    });
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
        onReorder={(ids) => projectsApi.reorder(ids)}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 dark:border-dark-border bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md px-4">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:bg-dark-border hover:text-gray-600"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <IconMenu />
          </button>

          {activeProject && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: activeProject.color + "20", color: activeProject.color }}>
                <IconFolder className="h-3.5 w-3.5" />
              </span>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{activeProject.name}</h1>
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
                className="h-8 w-48 rounded-lg border border-gray-200 dark:border-dark-border bg-canvas dark:bg-dark-raised pl-8 pr-3 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-accent focus:bg-white dark:focus:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-dark-border bg-canvas dark:bg-dark-raised p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                  view === "kanban" ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 shadow-card" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <IconKanban className="h-3.5 w-3.5" />
                Board
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                  view === "list" ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 shadow-card" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <IconList className="h-3.5 w-3.5" />
                List
              </button>
            </div>

            <ThemeToggle />

            {/* New task */}
            <button
              onClick={() => setTaskModal({ mode: "create", defaultStatus: "todo" })}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 sm:px-3 text-xs font-medium text-white hover:bg-accent-dark transition-colors"
            >
              <IconPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Task</span>
            </button>
          </div>
        </header>

        {/* Progress bar */}
        {activeProject && totalTasks > 0 && (
          <div className="border-b border-gray-200 dark:border-dark-border bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
                    style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-2xs font-medium text-gray-500 dark:text-gray-400">
                {doneTasks}/{totalTasks} done
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto bg-canvas dark:bg-dark-canvas p-4 sm:p-6">
          {!activeProjectId ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <IconFolder className="mb-4 h-12 w-12" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Select or create a project</p>
              <p className="mt-1 text-sm">Your tasks will appear here</p>
              <button
                onClick={() => setProjectModal({ mode: "create" })}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
              >
                <IconPlus className="h-4 w-4" />
                Create Project
              </button>
            </div>
          ) : tasksApi.loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-accent" />
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
              onReorder={handleReorder}
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
                tags: taskModal.task?.tags ?? [],
                assignee: taskModal.task?.assignee?.name ?? "",
                assigneeColor: taskModal.task?.assignee?.color ?? "",
              }}
              knownAssignees={allAssignees}
              knownTags={allTags}
              onSubmit={taskModal.mode === "create" ? handleCreateTask : handleUpdateTask}
              onCancel={() => setTaskModal(null)}
            />
            {taskModal.mode === "edit" && taskModal.task && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-4 py-3">
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
