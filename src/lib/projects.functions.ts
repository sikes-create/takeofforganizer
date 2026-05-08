import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./auth.functions";

export type Project = {
  id: number;
  name: string;
  bid_due_date: string;
  status: string;
  notes: string | null;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
};

const STATUSES = ["Taking Off", "Bidding", "Not Bidding", "Awarded", "Lost"];

export const listProjects = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .order("bid_due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows || []) as Project[];
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; name: string; bid_due_date: string; notes?: string | null }) => data)
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const name = String(data.name || "").trim();
    if (!name || name.length > 200) throw new Error("Invalid name");
    if (!data.bid_due_date) throw new Error("Bid due date required");
    const { error } = await supabaseAdmin.from("projects").insert({
      name,
      bid_due_date: data.bid_due_date,
      notes: data.notes ? String(data.notes).slice(0, 5000) : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      token: string;
      id: number;
      patch: { status?: string; notes?: string | null; claimed_by?: string | null };
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await requireSession(data.token);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.patch.status !== undefined) {
      if (!STATUSES.includes(data.patch.status)) throw new Error("Invalid status");
      patch.status = data.patch.status;
    }
    if (data.patch.notes !== undefined) {
      patch.notes = data.patch.notes ? String(data.patch.notes).slice(0, 5000) : null;
    }
    if (data.patch.claimed_by !== undefined) {
      // Only allow claiming as yourself or releasing
      if (data.patch.claimed_by !== null && data.patch.claimed_by !== session.name) {
        throw new Error("Can only claim as yourself");
      }
      patch.claimed_by = data.patch.claimed_by;
    }
    const { error } = await supabaseAdmin.from("projects").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; id: number }) => data)
  .handler(async ({ data }) => {
    await requireSession(data.token);
    // Remove storage files for this project's file attachments
    const { data: atts } = await supabaseAdmin
      .from("attachments")
      .select("filename, type")
      .eq("project_id", data.id);
    const paths = (atts || [])
      .filter((a) => a.type === "file" && a.filename)
      .map((a) => a.filename as string);
    if (paths.length) {
      await supabaseAdmin.storage.from("attachments").remove(paths);
    }
    await supabaseAdmin.from("attachments").delete().eq("project_id", data.id);
    const { error } = await supabaseAdmin.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
