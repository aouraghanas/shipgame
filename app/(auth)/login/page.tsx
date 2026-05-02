"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { useT } from "@/components/shared/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(t("login.invalid"));
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitch variant="inline" />
      </div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
            <Trophy className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("login.title")}</h1>
          <p className="text-zinc-400 text-sm mt-1">{t("login.subtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("login.signingIn") : t("login.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
