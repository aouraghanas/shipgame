import { AccountingWorkspace } from "@/components/accounting/AccountingWorkspace";
import { AccountingHeader } from "@/components/accounting/AccountingHeader";

export default function AccountingPage() {
  return (
    <div>
      <AccountingHeader />
      <AccountingWorkspace />
    </div>
  );
}
