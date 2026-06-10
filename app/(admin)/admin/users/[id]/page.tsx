"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getCurrentMonthKey } from "@/lib/utils";
import { PermissionEditor } from "@/components/admin/PermissionEditor";
import { baselineCapabilities, diffOverrides } from "@/lib/permissions/resolve";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  customRoleId: string | null;
  customRoleCapabilities: string[];
  effectiveCapabilities: string[];
};

type CustomRole = { id: string; name: string; description: string | null; capabilities: string[]; userCount: number };

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "", status: "", password: "" });
  const [noteContent, setNoteContent] = useState("");
  const [noteVisible, setNoteVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Permission layer state
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [customRoleId, setCustomRoleId] = useState<string>(""); // "" = none
  const [effective, setEffective] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then((u: User) => {
      setUser(u);
      setForm({ name: u.name, email: u.email, role: u.role, status: u.status, password: "" });
      setCustomRoleId(u.customRoleId ?? "");
      setEffective(new Set(u.effectiveCapabilities ?? []));
    });
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/admin/custom-roles").then((r) => (r.ok ? r.json() : [])).then(setCustomRoles);
    const month = getCurrentMonthKey();
    fetch(`/api/notes?month=${month}`).then((r) => r.json()).then((notes: { userId: string; content: string; visible: boolean }[]) => {
      const note = notes.find((n) => n.userId === id);
      if (note) { setNoteContent(note.content); setNoteVisible(note.visible); }
    });
  }, [id, load]);

  const isAdminRole = form.role === "ADMIN";

  // Baseline = role defaults ∪ selected custom role caps.
  const baseline = useMemo(() => {
    const cr = customRoles.find((r) => r.id === customRoleId);
    return baselineCapabilities(form.role, cr?.capabilities ?? null);
  }, [form.role, customRoleId, customRoles]);

  // When the base role or custom role changes, re-seed the effective set to
  // the new baseline (admin can then tweak). Skip on first load (handled above).
  const reseedToBaseline = useCallback(() => {
    setEffective(new Set(baseline));
  }, [baseline]);

  async function saveUser(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      status: form.status,
      customRoleId: customRoleId || null,
    };
    if (form.password) body.password = form.password;

    // ADMIN always has everything → never store overrides for admins.
    if (isAdminRole) {
      body.permissionOverrides = null;
    } else {
      const overrides = diffOverrides(effective, baseline);
      body.permissionOverrides =
        overrides.grant.length === 0 && overrides.deny.length === 0 ? null : overrides;
    }

    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(typeof j.error === "string" ? j.error : "Failed to save");
    } else {
      setSuccess("Saved!");
      load();
    }
    setSaving(false);
  }

  async function saveNote() {
    if (!noteContent.trim()) return;
    setSaving(true);
    await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, content: noteContent, visible: noteVisible }) });
    setSuccess("Note saved!");
    setSaving(false);
  }

  if (!user) return <div className="flex justify-center py-20"><div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/users"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        <Link href="/admin/custom-roles"><Button variant="outline" size="sm" className="gap-2"><ShieldCheck className="h-4 w-4" /> Manage custom roles</Button></Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Edit User — {user.name}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveUser} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>New Password (leave blank to keep)</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" minLength={6} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => { setForm({ ...form, role: v }); setTimeout(reseedToBaseline, 0); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SCREEN">Screen</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="LIBYAN_ACCOUNTANT">Libyan accountant (LYD only)</SelectItem>
                    <SelectItem value="SOURCING_AGENT">Sourcing agent</SelectItem>
                    <SelectItem value="TASK_AGENT">Task agent (tasks only)</SelectItem>
                    <SelectItem value="CONFIRMATION_AGENT">Confirmation agent (call center)</SelectItem>
                    <SelectItem value="CONFIRMATION_SCREEN">Confirmation screen (call-center TV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
            <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : "Save Changes"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand" /> Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdminRole ? (
            <p className="text-sm text-zinc-500">
              Admins always have full access to every page and action — permissions can’t be limited for this role.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Custom role template (optional)</Label>
                <Select
                  value={customRoleId || "none"}
                  onValueChange={(v) => {
                    const next = v === "none" ? "" : v;
                    setCustomRoleId(next);
                    // Re-seed effective to the new baseline so the editor reflects the template.
                    const cr = customRoles.find((r) => r.id === next);
                    setEffective(baselineCapabilities(form.role, cr?.capabilities ?? null));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="No custom role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No custom role (use base role)</SelectItem>
                    {customRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zinc-500">
                  Pick a saved template to start from, then fine-tune the toggles below for this user.
                </p>
              </div>

              <PermissionEditor
                value={effective}
                baseline={baseline}
                onChange={setEffective}
              />

              <Button type="button" onClick={() => saveUser()} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save permissions"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Note</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="e.g. Strong comeback, Top closer today..." rows={3} />
          <div className="flex items-center gap-3">
            <Switch checked={noteVisible} onCheckedChange={setNoteVisible} id="visible" />
            <Label htmlFor="visible">Visible on leaderboard</Label>
          </div>
          <Button onClick={saveNote} disabled={saving} variant="secondary" className="w-full">Save Note</Button>
        </CardContent>
      </Card>
    </div>
  );
}
