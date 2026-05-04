import { Badge } from "./Badge";
import type { TicketStatus } from "@/lib/types";

const tone: Record<TicketStatus, React.ComponentProps<typeof Badge>["tone"]> = {
  OPEN: "sky",
  IN_PROGRESS: "amber",
  WAITING: "slate",
  RESOLVED: "emerald",
  ARCHIVED: "neutral",
};

export function StatusBadge({ status, label }: { status: TicketStatus; label: string }) {
  return <Badge label={label} tone={tone[status]} />;
}
