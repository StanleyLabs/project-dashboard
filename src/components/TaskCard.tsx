import type { Task } from "../lib/types";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";

function priorityColor(p: Task["priority"]) {
  switch (p) {
    case "high":
      return "text-amber";
    case "medium":
      return "text-electric";
    case "low":
      return "text-teal";
    default:
      return "text-fog";
  }
}

export function TaskCard({
  task,
  onMove,
}: {
  task: Task;
  onMove?: (dir: "left" | "right") => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-insetHairline">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={"font-mono text-xs " + priorityColor(task.priority)}>
              {task.priority.toUpperCase()}
            </span>
            {task.tags?.slice(0, 2).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <div className="mt-2 font-display text-sm text-paper">{task.title}</div>
          {task.description ? (
            <div className="mt-1 text-xs leading-relaxed text-fog/80">{task.description}</div>
          ) : null}
        </div>

        {task.assignee ? <Avatar name={task.assignee.name} initials={task.assignee.initials} /> : null}
      </div>

      {onMove ? (
        <div className="mt-4 flex items-center justify-between">
          <button
            className="rounded-md border border-white/10 bg-ink/40 px-3 py-2 text-xs text-fog hover:bg-white/10"
            onClick={() => onMove("left")}
            type="button"
          >
            ←
          </button>
          <button
            className="rounded-md border border-white/10 bg-ink/40 px-3 py-2 text-xs text-fog hover:bg-white/10"
            onClick={() => onMove("right")}
            type="button"
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
