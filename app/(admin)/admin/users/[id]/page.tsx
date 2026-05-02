"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentMonthKey } from "@/lib/utils";

type User = { id: string; name: string; email: string; role: string; status: string; avatarUrl: string | null };

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

  useEffect(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then((u) => {
      setUser(u);
      setForm({ name: u.name, email: u.email, role: u.role, status: u.status, password: "" });
    });
    // Load existing note
    const month = getCurrentMonthKey();
    fetch(`/api/notes?month=${month}`).then((r) => r.json()).then((notes: { userId: string; content: string; visible: boolean }[]) => {
      const note = notes.find((n) => n.userId === id);
      if (note) { setNoteContent(note.content); setNoteVisible(note.visible); }
    });
  }, [id]);

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, status: form.status };
    if (form.password) body.password = form.password;

    const res = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setError("Failed to save"); } else { setSuccess("Saved!"); }
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
    <div className="max-w-lg space-y-6">
      <Link href="/admin/users"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>

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
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SCREEN">Screen</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="LIBYAN_ACCOUNTANT">Libyan accountant (LYD only)</SelectItem>
                    <SelectItem value="SOURCING_AGENT">Sourcing agent</SelectItem>
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
