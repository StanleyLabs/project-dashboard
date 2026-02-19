export function Avatar({ name, initials }: { name: string; initials: string }) {
  return (
    <span
      className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-xs text-paper"
      title={name}
    >
      {initials}
    </span>
  );
}
