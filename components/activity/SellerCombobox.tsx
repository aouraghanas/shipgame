"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, User, CheckCircle } from "lucide-react";

export type Seller = { id: string; name: string; email?: string | null };

interface Props {
  sellers: Seller[];
  value: Seller | null;
  onChange: (seller: Seller | null) => void;
  onNewSeller: (seller: Seller) => void;
}

export function SellerCombobox({ sellers, value, onChange, onNewSeller }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingNew(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = sellers
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  async function saveNewSeller() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || undefined }),
      });
      if (res.ok) {
        const seller: Seller = await res.json();
        onNewSeller(seller);
        onChange(seller);
        setQuery("");
        setOpen(false);
        setAddingNew(false);
        setNewName("");
        setNewEmail("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {value && !open ? (
        <div
          className="flex items-center gap-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm cursor-pointer hover:border-zinc-600 transition-colors"
          onClick={() => { setQuery(""); setOpen(true); }}
        >
          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-zinc-100">{value.name}</span>
            {value.email && <span className="text-zinc-500 ml-2 text-xs">{value.email}</span>}
          </div>
          <button
            type="button"
            className="text-xs text-zinc-500 hover:text-zinc-300"
            onClick={(e) => { e.stopPropagation(); onChange(null); setQuery(""); }}
          >
            change
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          <Input
            value={open ? query : ""}
            onChange={(e) => { setQuery(e.target.value); if (value) onChange(null); }}
            onFocus={() => setOpen(true)}
            placeholder="Search or add a seller..."
            className="pl-9"
            autoComplete="off"
          />
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
          {filtered.length > 0 && (
            <ul className="max-h-48 overflow-y-auto">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(s); setQuery(""); setOpen(false); setAddingNew(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                    <span className="text-zinc-100">{s.name}</span>
                    {s.email && <span className="text-zinc-500 text-xs">{s.email}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtered.length === 0 && !addingNew && query && (
            <div className="px-3 py-3 text-sm text-zinc-500">
              No sellers match &quot;{query}&quot;
            </div>
          )}

          {!addingNew && (
            <button
              type="button"
              onClick={() => { setAddingNew(true); setNewName(query); }}
              className="w-full text-left px-3 py-2.5 text-sm text-indigo-400 hover:bg-zinc-800 flex items-center gap-2 border-t border-zinc-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              {query ? `Add "${query}" as new seller` : "Add new seller"}
            </button>
          )}

          {addingNew && (
            <div
              className="p-3 space-y-2 border-t border-zinc-800"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!saving && newName.trim()) void saveNewSeller();
                }
              }}
            >
              <p className="text-xs font-semibold text-zinc-300">Add New Seller</p>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name *"
                autoFocus
                className="text-sm h-8"
              />
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email (optional)"
                className="text-sm h-8"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !newName.trim()}
                  className="flex-1 h-7 text-xs"
                  onClick={() => void saveNewSeller()}
                >
                  {saving ? "Adding..." : "Add Seller"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAddingNew(false)} className="h-7 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
