import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File, Link as LinkIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Attachment = {
  id: number;
  project_id: number;
  label: string;
  url: string | null;
  filename: string | null;
  original_name: string | null;
  type: string;
};

export function AttachmentsSection({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ["attachments", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Attachment[];
    },
  });

  const addLink = useMutation({
    mutationFn: async () => {
      let url = linkUrl;
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      const { error } = await supabase.from("attachments").insert({
        project_id: projectId,
        label: linkLabel,
        url,
        type: "link",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLinkLabel("");
      setLinkUrl("");
      setLinkOpen(false);
      toast.success("Link added");
      qc.invalidateQueries({ queryKey: ["attachments", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (att: Attachment) => {
      if (att.type === "file" && att.filename) {
        await supabase.storage.from("attachments").remove([att.filename]);
      }
      const { error } = await supabase.from("attachments").delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", projectId] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path);
      const { error } = await supabase.from("attachments").insert({
        project_id: projectId,
        label: file.name,
        type: "file",
        filename: path,
        original_name: file.name,
        url: pub.publicUrl,
      });
      if (error) throw error;
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: ["attachments", projectId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          Attachments
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </h4>
        <div className="flex items-center gap-1">
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-3">
                <h5 className="font-medium text-sm">Add Link</h5>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="e.g. Plans folder"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8"
                    onClick={() => addLink.mutate()}
                    disabled={!linkLabel || !linkUrl || addLink.isPending}
                  >
                    {addLink.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Link"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-7 w-7 relative overflow-hidden" disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )}
            <input
              ref={fileRef}
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleUpload}
            />
          </Button>
        </div>
      </div>

      {attachments && attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between group rounded bg-background/50 px-2 py-1.5 text-sm"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {a.type === "link" ? (
                  <LinkIcon className="h-3.5 w-3.5 flex-shrink-0 text-[oklch(0.68_0.17_250)]" />
                ) : (
                  <File className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                )}
                <a
                  href={a.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline text-muted-foreground hover:text-foreground"
                >
                  {a.label}
                </a>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => del.mutate(a)}
                disabled={del.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-muted-foreground italic text-center py-2">No attachments yet</div>
      )}
    </div>
  );
}