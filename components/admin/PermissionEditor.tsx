"use client";

import { useMemo } from "react";
import { CATALOG } from "@/lib/permissions/catalog";

/**
 * Per-feature permission editor.
 *
 * `value` is the set of capability keys the user effectively has. Toggling a
 * checkbox adds/removes that capability from the set. The parent computes the
 * grant/deny overrides on save by diffing this set against the user's base
 * (role + custom role) capabilities.
 *
 * `baseline` (role + custom role caps) is shown as a subtle hint so the admin
 * knows which toggles already come "for free" from the role.
 */
export function PermissionEditor({
  value,
  baseline,
  disabled,
  onChange,
}: {
  value: Set<string>;
  baseline: Set<string>;
  disabled?: boolean;
  onChange: (next: Set<string>) => void;
}) {
  const total = useMemo(
    () => CATALOG.reduce((n, f) => n + f.actions.length, 0),
    []
  );
  const grantedCount = value.size;

  function toggle(cap: string, on: boolean) {
    const next = new Set(value);
    if (on) next.add(cap);
    else next.delete(cap);
    onChange(next);
  }

  function toggleFeature(featureKey: string, on: boolean) {
    const next = new Set(value);
    const feature = CATALOG.find((f) => f.key === featureKey);
    feature?.actions.forEach((a) => {
      const cap = `${featureKey}.${a.action}`;
      if (on) next.add(cap);
      else next.delete(cap);
    });
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        {grantedCount} of {total} capabilities enabled. Toggles already covered by
        the base role are marked “role”.
      </p>

      {CATALOG.map((feature) => {
        const featureCaps = feature.actions.map((a) => `${feature.key}.${a.action}`);
        const allOn = featureCaps.every((c) => value.has(c));
        const someOn = featureCaps.some((c) => value.has(c));
        return (
          <div
            key={feature.key}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {feature.label}
              </span>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 select-none">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={allOn}
                  ref={(el) => {
                    if (el) el.indeterminate = !allOn && someOn;
                  }}
                  onChange={(e) => toggleFeature(feature.key, e.target.checked)}
                />
                All
              </label>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {feature.actions.map((a) => {
                const cap = `${feature.key}.${a.action}`;
                const fromRole = baseline.has(cap);
                return (
                  <label
                    key={cap}
                    className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      disabled={disabled}
                      checked={value.has(cap)}
                      onChange={(e) => toggle(cap, e.target.checked)}
                    />
                    <span className="flex-1">
                      <span className="text-zinc-800 dark:text-zinc-200">{a.label}</span>
                      {a.hint && (
                        <span className="block text-[11px] text-zinc-400">{a.hint}</span>
                      )}
                    </span>
                    {fromRole && (
                      <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                        role
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
