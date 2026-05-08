import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SESSION_DAYS = 30;

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function requireSession(token: string | undefined | null) {
  if (!token) throw new Error("Not signed in");
  const { data, error } = await supabaseAdmin
    .from("app_users")
    .select("id, name, must_change_pin, session_expires_at")
    .eq("session_token", token)
    .maybeSingle();
  if (error || !data) throw new Error("Session invalid");
  if (data.session_expires_at && new Date(data.session_expires_at).getTime() < Date.now()) {
    throw new Error("Session expired");
  }
  return data;
}

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("app_users")
    .select("id, name")
    .order("id");
  if (error) throw new Error(error.message);
  return (data || []) as Array<{ id: number; name: string }>;
});

export const verifyPin = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; pin: string }) => data)
  .handler(async ({ data }) => {
    const { name, pin } = data;
    if (!name || !pin) return { ok: false as const, error: "Name and PIN are required" };
    const { data: row, error } = await supabaseAdmin
      .from("app_users")
      .select("id, name, pin, must_change_pin")
      .eq("name", name)
      .maybeSingle();
    if (error || !row) return { ok: false as const, error: "Unknown user" };
    if (String(row.pin).trim() !== String(pin).trim()) {
      return { ok: false as const, error: "Incorrect PIN" };
    }
    const token = newToken();
    const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
    const { error: upErr } = await supabaseAdmin
      .from("app_users")
      .update({ session_token: token, session_expires_at: expires })
      .eq("id", row.id);
    if (upErr) return { ok: false as const, error: upErr.message };
    return {
      ok: true as const,
      name: row.name,
      id: row.id,
      token,
      mustChangePin: !!row.must_change_pin,
    };
  });

export const changePin = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; newPin: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireSession(data.token);
    const pin = String(data.newPin || "").trim();
    if (!/^\d{4}$/.test(pin)) {
      return { ok: false as const, error: "PIN must be 4 digits" };
    }
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ pin, must_change_pin: false })
      .eq("id", session.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    if (data.token) {
      await supabaseAdmin
        .from("app_users")
        .update({ session_token: null, session_expires_at: null })
        .eq("session_token", data.token);
    }
    return { ok: true as const };
  });

export const me = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    try {
      const s = await requireSession(data.token);
      return { ok: true as const, name: s.name, id: s.id, mustChangePin: !!s.must_change_pin };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });