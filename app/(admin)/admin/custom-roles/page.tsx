"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, ShieldCheck } from "lucide-react";
import { PermissionEditor } from "@/components/admin/PermissionEditor";

type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  capabilities: string[];
  userCount: number;
};

const EMPTY = new Set<string>();

export default function CustomRolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state — editing an existing role (id set) or creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [caps, setCaps] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/custom-roles")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CustomRole[]) => setRoles(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingId(null);
    setName("");
    setDescription("");
    setCaps(new Set());
    setError("");
  }

  function startEdit(r: CustomRole) {
    setEditingId(r.id);
    setName(r.name);
    setDescription(r.description ?? "");
    setCaps(new Set(r.capabilities));
    setError("");
  }

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      capabilities: Array.from(caps),
    };
    const res = editingId
      ? await fetch(`/api/admin/custom-roles/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/custom-roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(typeof j.error === "string" ? j.error : "Failed to save.");
    } else {
      startNew();
      load();
    }
    setSaving(false);
  }

  async function remove(r: CustomRole) {
    if (!confirm(`Delete custom role "${r.name}"? Users using it will fall back to their base role.`)) return;
    await fetch(`/api/admin/custom-roles/${r.id}`, { method: "DELETE" });
    if (editingId === r.id) startNew();
    load();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/users"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to users</Button></Link>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Roles list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Custom roles</h2>
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={startNew}>
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-zinc-500">No custom roles yet. Create one to reuse a set of permissions.</p>
          ) : (
            roles.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  editingId === r.id
                    ? "border-brand bg-brand/5"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                }`}
                onClick={() => startEdit(r)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand" /> {r.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); remove(r); }}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {r.description && <p className="mt-0.5 text-xs text-zinc-500">{r.description}</p>}
                <p className="mt-1 text-[11px] text-zinc-400">
                  {r.capabilities.length} capabilities · {r.userCount} user{r.userCount === 1 ? "" : "s"}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Edit role" : "New custom role"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Junior accountant" maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={300} />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionEditor value={caps} baseline={EMPTY} onChange={setCaps} />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="flex-1">
                {saving ? "Saving…" : editingId ? "Save role" : "Create role"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={startNew} disabled={saving}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
