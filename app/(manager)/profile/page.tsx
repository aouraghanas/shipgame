"use client";

import { useSession } from "next-auth/react";
import { useState, useRef } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user.name ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (password && password !== confirm) { setError("Passwords do not match"); return; }
    setSaving(true);

    const body: Record<string, unknown> = { name };
    if (password) body.password = password;

    const res = await fetch(`/api/users/${session?.user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await update({ name });
      setSuccess("Profile updated!"); setPassword(""); setConfirm("");
    } else { setError("Failed to save"); }
    setSaving(false);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { avatarUrl } = await res.json();
      await update({ avatarUrl });
      setSuccess("Avatar updated!");
    } else { setError("Upload failed"); }
    setUploading(false);
  }

  if (!session) return null;

  return (
    <div className="max-w-md">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar name={session.user.name} avatarUrl={session.user.avatarUrl} size="xl" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-600 border-2 border-zinc-950 hover:bg-indigo-500 transition-colors"
              >
                <Camera className="h-4 w-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </div>
            {uploading && <p className="text-sm text-zinc-400">Uploading...</p>}
            <div className="text-center">
              <p className="font-semibold text-zinc-100">{session.user.name}</p>
              <p className="text-sm text-zinc-400">{session.user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Edit Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>New Password (leave blank to keep current)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
            {password && (
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
            <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : "Save Changes"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
