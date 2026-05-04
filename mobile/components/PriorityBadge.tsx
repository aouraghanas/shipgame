import { Badge } from "./Badge";
import type { TicketPriority } from "@/lib/types";

const tone: Record<TicketPriority, React.ComponentProps<typeof Badge>["tone"]> = {
  LOW: "slate",
  NORMAL: "sky",
  HIGH: "amber",
  URGENT: "brand",
};

export function PriorityBadge({ priority, label }: { priority: TicketPriority; label: string }) {
  return <Badge label={label} tone={tone[priority]} />;
}
