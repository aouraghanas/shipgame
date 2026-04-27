"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TipTapEditor } from "@/components/admin/TipTapEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, ExternalLink } from "lucide-react";

const TYPE_PRESETS = {
  INFO:    { bg: "#1e3a5f", text: "#93c5fd", border: "#3b82f6", icon: "ℹ️", label: "Info" },
  WARNING: { bg: "#451a03", text: "#fde68a", border: "#f59e0b", icon: "⚠️", label: "Warning" },
  SUCCESS: { bg: "#052e16", text: "#86efac", border: "#22c55e", icon: "✅", label: "Success" },
  DANGER:  { bg: "#450a0a", text: "#fca5a5", border: "#ef4444", icon: "🚨", label: "Danger" },
  PROMO:   { bg: "#2d1b69", text: "#c4b5fd", border: "#8b5cf6", icon: "🎉", label: "Promo" },
} as const;

type NotifType = keyof typeof TYPE_PRESETS;

interface NotificationFormProps {
  initialData?: Record<string, unknown>;
  mode: "create" | "edit";
  notificationId?: string;
}

interface FormState {
  title: string;
  content: string;
  type: NotifType;
  bgColor: string;
  textColor: string;
  icon: string;
  ctaText: string;
  ctaUrl: string;
  ctaNewTab: boolean;
  isActive: boolean;
  isDraft: boolean;
  isDismissible: boolean;
  frequency: string;
  targetRoles: string[];
  displayPages: string[];
  priority: number;
  startAt: string;
  endAt: string;
  useCustomColors: boolean;
}

export function NotificationForm({ initialData, mode, notificationId }: NotificationFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    title: (initialData?.title as string) || "",
    content: (initialData?.content as string) || "<p>Your announcement here…</p>",
    type: ((initialData?.type as NotifType) || "INFO"),
    bgColor: (initialData?.bgColor as string) || "",
    textColor: (initialData?.textColor as string) || "",
    icon: (initialData?.icon as string) || "",
    ctaText: (initialData?.ctaText as string) || "",
    ctaUrl: (initialData?.ctaUrl as string) || "",
    ctaNewTab: (initialData?.ctaNewTab as boolean) ?? true,
    isActive: (initialData?.isActive as boolean) ?? false,
    isDraft: (initialData?.isDraft as boolean) ?? true,
    isDismissible: (initialData?.isDismissible as boolean) ?? true,
    frequency: (initialData?.frequency as string) || "ALWAYS",
    targetRoles: (initialData?.targetRoles as string[]) || [],
    displayPages: (initialData?.displayPages as string[]) || ["leaderboard"],
    priority: (initialData?.priority as number) ?? 0,
    startAt: initialData?.startAt ? new Date(initialData.startAt as string).toISOString().slice(0, 16) : "",
    endAt: initialData?.endAt ? new Date(initialData.endAt as string).toISOString().slice(0, 16) : "",
    useCustomColors: !!(initialData?.bgColor || initialData?.textColor),
  });

  const set = (key: keyof FormState) => (val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleArr = (key: "targetRoles" | "displayPages", val: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val],
    }));

  const preset = TYPE_PRESETS[form.type];
  const resolvedBg = form.useCustomColors && form.bgColor ? form.bgColor : preset.bg;
  const resolvedText = form.useCustomColors && form.textColor ? form.textColor : preset.text;
  const resolvedIcon = form.icon || preset.icon;

  const handleTypeChange = (t: NotifType) => {
    setForm((f) => ({ ...f, type: t }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      content: form.content,
      type: form.type,
      bgColor: form.useCustomColors ? form.bgColor || null : null,
      textColor: form.useCustomColors ? form.textColor || null : null,
      icon: form.icon || null,
      ctaText: form.ctaText || null,
      ctaUrl: form.ctaUrl || null,
      ctaNewTab: form.ctaNewTab,
      isActive: form.isActive,
      isDraft: form.isDraft,
      isDismissible: form.isDismissible,
      frequency: form.frequency,
      targetRoles: form.targetRoles,
      displayPages: form.displayPages,
      priority: form.priority,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
    };

    try {
      const url = mode === "edit" ? `/api/notifications/${notificationId}` : "/api/notifications";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      router.push("/admin/notifications");
      router.refresh();
    } catch {
      setError("Failed to save notification. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle = (t: string) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">{t}</h3>
  );

  const checkBtn = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
      active
        ? "bg-indigo-600 border-indigo-500 text-white"
        : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
    }`;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ─── LEFT FORM PANEL ─── */}
      <div className="lg:col-span-3 space-y-6">

        {/* Basic Info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          {sectionTitle("Basic Info")}
          <div>
            <Label className="text-zinc-300 text-sm mb-1.5 block">Internal Title</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="e.g. Maintenance notice April"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            <p className="text-xs text-zinc-500 mt-1">Only visible to admins</p>
          </div>
          <div>
            <Label className="text-zinc-300 text-sm mb-1.5 block">Message Content</Label>
            <TipTapEditor content={form.content} onChange={set("content")} />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm mb-1.5 block">Icon / Emoji</Label>
            <Input
              value={form.icon}
              onChange={(e) => set("icon")(e.target.value)}
              placeholder="e.g. 🚀"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-28"
            />
          </div>
        </div>

        {/* Style */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          {sectionTitle("Style & Appearance")}
          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Type Preset</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_PRESETS) as NotifType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={checkBtn(form.type === t)}
                  style={form.type === t ? { backgroundColor: TYPE_PRESETS[t].bg, borderColor: TYPE_PRESETS[t].border, color: TYPE_PRESETS[t].text } : {}}
                >
                  {TYPE_PRESETS[t].icon} {TYPE_PRESETS[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.useCustomColors}
              onCheckedChange={set("useCustomColors")}
              id="custom-colors"
            />
            <Label htmlFor="custom-colors" className="text-zinc-300 text-sm cursor-pointer">
              Override with custom colors
            </Label>
          </div>
          {form.useCustomColors && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.bgColor || "#1e3a5f"}
                    onChange={(e) => set("bgColor")(e.target.value)}
                    className="h-9 w-14 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
                  />
                  <Input
                    value={form.bgColor}
                    onChange={(e) => set("bgColor")(e.target.value)}
                    placeholder="#1e3a5f"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Text Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.textColor || "#93c5fd"}
                    onChange={(e) => set("textColor")(e.target.value)}
                    className="h-9 w-14 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
                  />
                  <Input
                    value={form.textColor}
                    onChange={(e) => set("textColor")(e.target.value)}
                    placeholder="#93c5fd"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          {sectionTitle("Call-to-Action Button (optional)")}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-300 text-sm mb-1.5 block">Button Text</Label>
              <Input
                value={form.ctaText}
                onChange={(e) => set("ctaText")(e.target.value)}
                placeholder="Learn more"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm mb-1.5 block">Button URL</Label>
              <Input
                value={form.ctaUrl}
                onChange={(e) => set("ctaUrl")(e.target.value)}
                placeholder="https://…"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.ctaNewTab} onCheckedChange={set("ctaNewTab")} id="cta-newtab" />
            <Label htmlFor="cta-newtab" className="text-zinc-300 text-sm cursor-pointer">
              Open in new tab
            </Label>
          </div>
        </div>

        {/* Visibility */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
          {sectionTitle("Visibility & Behavior")}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={set("isActive")} id="is-active" />
              <Label htmlFor="is-active" className="text-zinc-300 text-sm cursor-pointer">Active</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isDraft} onCheckedChange={set("isDraft")} id="is-draft" />
              <Label htmlFor="is-draft" className="text-zinc-300 text-sm cursor-pointer">Save as Draft</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isDismissible} onCheckedChange={set("isDismissible")} id="dismissible" />
              <Label htmlFor="dismissible" className="text-zinc-300 text-sm cursor-pointer">Users can dismiss</Label>
            </div>
          </div>

          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Frequency</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "ALWAYS", l: "Always" },
                { v: "ONCE_PER_SESSION", l: "Once per session" },
                { v: "UNTIL_DISMISSED", l: "Until dismissed" },
              ].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set("frequency")(v)} className={checkBtn(form.frequency === v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Target Audience</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, targetRoles: [] }))}
                className={checkBtn(form.targetRoles.length === 0)}
              >
                All Users
              </button>
              {["ADMIN", "MANAGER", "SCREEN", "ACCOUNTANT"].map((r) => (
                <button key={r} type="button" onClick={() => toggleArr("targetRoles", r)} className={checkBtn(form.targetRoles.includes(r))}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Display Pages</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "all", l: "All Pages" },
                { v: "leaderboard", l: "Leaderboard" },
                { v: "dashboard", l: "Dashboard" },
                { v: "screen", l: "Screen" },
                { v: "activity", l: "Activity" },
                { v: "profile", l: "Profile" },
              ].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => toggleArr("displayPages", v)} className={checkBtn(form.displayPages.includes(v))}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scheduling */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          {sectionTitle("Scheduling")}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-300 text-sm mb-1.5 block">Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => set("startAt")(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm mb-1.5 block">End Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => set("endAt")(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
          <div className="w-32">
            <Label className="text-zinc-300 text-sm mb-1.5 block">Priority</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.priority}
              onChange={(e) => set("priority")(parseInt(e.target.value) || 0)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            <p className="text-xs text-zinc-500 mt-1">Higher = shown first</p>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Notification"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/notifications")}
            className="border-zinc-700"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* ─── RIGHT PREVIEW PANEL ─── */}
      <div className="lg:col-span-2">
        <div className="sticky top-24 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Preview</h3>

          {/* Desktop preview */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <p className="text-xs text-zinc-500 px-3 py-2 border-b border-zinc-800">Desktop</p>
            <div className="p-2">
              <PreviewBar
                bg={resolvedBg}
                text={resolvedText}
                border={preset.border}
                icon={resolvedIcon}
                content={form.content}
                ctaText={form.ctaText}
                ctaUrl={form.ctaUrl}
                ctaNewTab={form.ctaNewTab}
                isDismissible={form.isDismissible}
              />
            </div>
          </div>

          {/* Mobile preview */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <p className="text-xs text-zinc-500 px-3 py-2 border-b border-zinc-800">Mobile (375px)</p>
            <div className="p-2" style={{ maxWidth: 375 }}>
              <PreviewBar
                bg={resolvedBg}
                text={resolvedText}
                border={preset.border}
                icon={resolvedIcon}
                content={form.content}
                ctaText={form.ctaText}
                ctaUrl={form.ctaUrl}
                ctaNewTab={form.ctaNewTab}
                isDismissible={form.isDismissible}
              />
            </div>
          </div>

          {/* Info badges */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Status</span>
              <span className={form.isDraft ? "text-zinc-400" : form.isActive ? "text-emerald-400" : "text-red-400"}>
                {form.isDraft ? "Draft" : form.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Audience</span>
              <span className="text-zinc-200">
                {form.targetRoles.length === 0 ? "Everyone" : form.targetRoles.join(", ")}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Pages</span>
              <span className="text-zinc-200 text-right max-w-32 truncate">
                {form.displayPages.join(", ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function PreviewBar({
  bg, text, border, icon, content, ctaText, ctaUrl, ctaNewTab, isDismissible,
}: {
  bg: string; text: string; border: string; icon: string;
  content: string; ctaText: string; ctaUrl: string; ctaNewTab: boolean; isDismissible: boolean;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5 flex items-start gap-2 text-sm"
      style={{ backgroundColor: bg, borderColor: border, color: text }}
    >
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div
        className="flex-1 min-w-0 notification-content"
        style={{ color: text }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {ctaText && ctaUrl && (
        <a
          href={ctaUrl}
          target={ctaNewTab ? "_blank" : "_self"}
          rel="noreferrer"
          className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold underline opacity-80 hover:opacity-100"
          style={{ color: text }}
        >
          {ctaText}
          {ctaNewTab && <ExternalLink className="h-3 w-3" />}
        </a>
      )}
      {isDismissible && (
        <button type="button" className="flex-shrink-0 opacity-60 hover:opacity-100" style={{ color: text }}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
