"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloudEnabled, supabase } from "@/lib/store/supabase";
import { syncNow } from "@/lib/store/sync";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/chip";
import { Logo } from "@/components/shell/nav";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-6 pt-20 text-center">
        <Logo className="justify-center" />
        <p className="text-muted">Cloud accounts aren’t configured for this deployment. FORGE BY BK is running in on-device mode — your data stays on this device.</p>
        <Button asChild><Link href="/">Back to app</Link></Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setBusy(true);
    const sb = supabase()!;
    const res = mode === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    if (mode === "up" && !res.data.session) return setInfo("Check your inbox to confirm your email, then sign in.");
    // Data on this device that belongs to someone else is cleared before this account syncs.
    if (res.data.user) useStore.getState().claimForUser(res.data.user.id);
    await syncNow();
    router.replace("/");
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-5 p-6 pt-16" noValidate>
      <Logo />
      <h1 className="font-display text-4xl font-bold uppercase">{mode === "in" ? "Welcome back" : "Create account"}</h1>
      <Segmented value={mode} onChange={setMode} options={[{ value: "in", label: "Sign in" }, { value: "up", label: "Sign up" }]} ariaLabel="Mode" />
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="pw" hint="At least 8 characters">
        <Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {info && <p className="text-sm text-accent" role="status">{info}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
      <Link href="/" className="block text-center text-sm text-muted">Continue without an account</Link>
    </form>
  );
}
