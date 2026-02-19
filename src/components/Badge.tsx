import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-fog/85">
      {children}
    </span>
  );
}
