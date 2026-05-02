"use client";

import { Landmark } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";

export function AccountingHeader() {
  const t = useT();
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white flex items-center gap-3">
        <Landmark className="h-8 w-8 text-indigo-400" />
        {t("accounting.title")}
      </h1>
      <p className="text-zinc-400 mt-1 max-w-3xl">{t("accounting.subtitle")}</p>
    </div>
  );
}
