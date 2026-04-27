import { AccountingWorkspace } from "@/components/accounting/AccountingWorkspace";
import { Landmark } from "lucide-react";

export default function AccountingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Landmark className="h-8 w-8 text-indigo-400" />
          Shipeh accounting
        </h1>
        <p className="text-zinc-400 mt-1 max-w-3xl">
          Manual ledger for Libya operations: expenses (−), revenue (+), per-city delivery spreads, COD %, lead fees, FX
          rates, and AI-assisted period reviews. Numbers you enter here are the source of truth until Shipeh APIs sync.
        </p>
      </div>
      <AccountingWorkspace />
    </div>
  );
}
