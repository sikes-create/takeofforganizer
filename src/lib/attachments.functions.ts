import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./auth.functions";

export type Attachment = {
  id: number;
  project_id: number;
  label: string;
  url: string | null;
  filename: string | null;
  original_name: string | null;
  type: string;
  created_at: string;
};

export const listAttachments = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; projectId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("attachments")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    // Re-sign file URLs (1 hour)
    const out = await Promise.all(
      (rows || []).map(async (a) => {
        if (a.type === "file" && a.filename) {
          const { data: signed } = await supabaseAdmin.storage
            .from("attachments")
            .createSignedUrl(a.filename, 3600);
          return { ...a, url: signed?.signedUrl ?? null };
        }
        return a;
      }),
    );
    return out as Attachment[];
  });

export const addLink = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; projectId: number; label: string; url: string }) => data)
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const label = String(data.label || "").trim().slice(0, 200);
    let url = String(data.url || "").trim();
    if (!label || !url) throw new Error("Label and URL required");
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (url.length > 2000) throw new Error("URL too long");
    const { error } = await supabaseAdmin.from("attachments").insert({
      project_id: data.projectId,
      label,
      url,
      type: "link",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const createUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; projectId: number; filename: string }) => data)
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const safe = String(data.filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const path = `${data.projectId}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("attachments")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message || "Could not create upload");
    return { path, signedUrl: signed.signedUrl, token: signed.token };
  });

export const recordUpload = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { token: string; projectId: number; path: string; originalName: string }) => data,
  )
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const { error } = await supabaseAdmin.from("attachments").insert({
      project_id: data.projectId,
      label: data.originalName.slice(0, 200),
      type: "file",
      filename: data.path,
      original_name: data.originalName.slice(0, 200),
      url: null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteAttachment = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; id: number }) => data)
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const { data: row } = await supabaseAdmin
      .from("attachments")
      .select("type, filename")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.type === "file" && row.filename) {
      await supabaseAdmin.storage.from("attachments").remove([row.filename]);
    }
    const { error } = await supabaseAdmin.from("attachments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
