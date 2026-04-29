/** Row chrome by priority — light tints on dark UI so urgency reads clearly without heavy blocks. */
export function ticketRowClasses(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "border-l-[3px] border-l-rose-500 bg-rose-500/[0.07] border border-zinc-800/90";
    case "HIGH":
      return "border-l-[3px] border-l-amber-500 bg-amber-500/[0.06] border border-zinc-800/90";
    case "NORMAL":
      return "border-l-[3px] border-l-sky-500/70 bg-sky-500/[0.05] border border-zinc-800/90";
    case "LOW":
    default:
      return "border-l-[3px] border-l-zinc-600 bg-zinc-900/50 border border-zinc-800/90";
  }
}

export function ticketStatusBadgeClasses(status: string): string {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500/10 text-emerald-200/90 border border-emerald-500/25";
    case "IN_PROGRESS":
      return "bg-indigo-500/10 text-indigo-200/90 border border-indigo-500/25";
    case "WAITING":
      return "bg-amber-500/10 text-amber-200/90 border border-amber-500/25";
    case "RESOLVED":
      return "bg-zinc-500/10 text-zinc-300 border border-zinc-600/35";
    case "ARCHIVED":
      return "bg-zinc-700/15 text-zinc-400 border border-zinc-600/30";
    default:
      return "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50";
  }
}
