"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase now labels this the "publishable" key; older projects call it the "anon" key. Either works.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** Cloud sync is optional: without env vars the app runs fully on-device. */
export const cloudEnabled = Boolean(url && key);

export function supabase(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  if (!client) client = createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
