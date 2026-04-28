"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MANAGER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || data.error || "Failed to create user");
      setLoading(false);
      return;
    }

    router.push("/admin/users");
  }

  return (
    <div className="max-w-lg">
      <Link href="/admin/users">
        <Button variant="ghost" size="sm" className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@shipeh.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SCREEN">Screen</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="SOURCING_AGENT">Sourcing agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create User"}
              </Button>
              <Link href="/admin/users">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
