import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const verifyPin = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; pin: string }) => data)
  .handler(async ({ data }) => {
    const { name, pin } = data;
    if (!name || !pin) return { ok: false as const, error: "Name and PIN are required" };
    const { data: row, error } = await supabaseAdmin
      .from("app_users")
      .select("id, name, pin")
      .eq("name", name)
      .maybeSingle();
    if (error || !row) return { ok: false as const, error: "Unknown user" };
    if (String(row.pin).trim() !== String(pin).trim()) {
      return { ok: false as const, error: "Incorrect PIN" };
    }
    return { ok: true as const, name: row.name, id: row.id };
  });