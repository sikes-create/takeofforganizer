import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, DollarSign, Pencil, Trash2, User } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AttachmentsSection } from "./AttachmentsSection";
import { updateProject, deleteProject, type Project } from "@/lib/projects.functions";

export type { Project };

const STATUSES = ["Taking Off", "Bidding", "Not Bidding", "Awarded", "Lost"];

function statusClasses(s: string) {
  switch (s) {
    case "Taking Off": return "bg-[var(--status-taking-off)]/15 text-[var(--status-taking-off)] border border-[var(--status-taking-off)]/40";
    case "Bidding": return "bg-[var(--status-bidding)]/15 text-[var(--status-bidding)] border border-[var(--status-bidding)]/40";
    case "Not Bidding": return "bg-[var(--status-not-bidding)]/15 text-[var(--status-not-bidding)] border border-[var(--status-not-bidding)]/40";
    case "Awarded": return "bg-[var(--status-awarded)]/15 text-[var(--status-awarded)] border border-[var(--status-awarded)]/40";
    case "Lost": return "bg-[var(--status-lost)]/15 text-[var(--status-lost)] border border-[var(--status-lost)]/40";
    default: return "bg-muted text-muted-foreground";
  }
}

export function ProjectCard({ project }: { project: Project }) {
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const updateFn = useServerFn(updateProject);
  const deleteFn = useServerFn(deleteProject);
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(project.notes || "");
  const [editingContract, setEditingContract] = useState(false);
  const [contractValue, setContractValue] = useState(
    project.contract_amount != null ? String(project.contract_amount) : "",
  );

  const update = useMutation({
    mutationFn: async (patch: { status?: string; notes?: string | null; claimed_by?: string | null; contract_amount?: number | null }) => {
      if (!token) throw new Error("Not signed in");
      await updateFn({ data: { token, id: project.id, patch } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not signed in");
      await deleteFn({ data: { token, id: project.id } });
    },
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isMine = project.claimed_by === user;
  const isOther = project.claimed_by && project.claimed_by !== user;

  return (
    <div className="group rounded-lg border border-border bg-card p-4 shadow-sm hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1 pr-4">
          <h3 className="font-semibold text-lg leading-none tracking-tight">{project.name}</h3>
          <div className="text-xs text-muted-foreground font-medium">
            Due: {format(parseISO(project.bid_due_date), "MMM d, yyyy")}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge className={`cursor-pointer px-2 py-0.5 ${statusClasses(project.status)}`}>
              {project.status}
              <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => update.mutate({ status: s })}
                className={project.status === s ? "bg-accent" : ""}
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center text-sm">
          {project.claimed_by ? (
            <span className="flex items-center text-primary font-medium bg-primary/10 px-2 py-1 rounded">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {project.claimed_by}
            </span>
          ) : (
            <span className="flex items-center text-muted-foreground">
              <User className="mr-1.5 h-3.5 w-3.5" />
              Unclaimed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!project.claimed_by && (
            <Button size="sm" variant="outline" className="h-8" onClick={() => update.mutate({ claimed_by: user })}>
              Sign Name
            </Button>
          )}
          {isMine && (
            <Button size="sm" variant="secondary" className="h-8" onClick={() => update.mutate({ claimed_by: null })}>
              Release
            </Button>
          )}
          {isOther && (
            <Button size="sm" variant="outline" className="h-8" onClick={() => update.mutate({ claimed_by: user })}>
              Take Over
            </Button>
          )}
        </div>
      </div>

      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex justify-between p-0 h-auto hover:bg-transparent text-muted-foreground hover:text-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Details</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the project and its attachments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => del.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <CollapsibleContent className="pt-3 pb-1 space-y-4">
          {project.status === "Awarded" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Contract Amount
                </h4>
                {!editingContract && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingContract(true)}>
                    {project.contract_amount != null ? "Edit" : "Add"}
                  </Button>
                )}
              </div>
              {editingContract ? (
                <div className="space-y-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    placeholder="e.g. 12500.00"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingContract(false);
                      setContractValue(project.contract_amount != null ? String(project.contract_amount) : "");
                    }}>Cancel</Button>
                    {project.contract_amount != null && (
                      <Button variant="outline" size="sm" onClick={() => update.mutate(
                        { contract_amount: null },
                        { onSuccess: () => { setEditingContract(false); setContractValue(""); toast.success("Cleared"); } },
                      )}>Clear</Button>
                    )}
                    <Button size="sm" disabled={update.isPending} onClick={() => {
                      const n = Number(contractValue);
                      if (!Number.isFinite(n) || n < 0) { toast.error("Enter a valid amount"); return; }
                      update.mutate(
                        { contract_amount: n },
                        { onSuccess: () => { setEditingContract(false); toast.success("Contract saved"); } },
                      );
                    }}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm bg-background/50 rounded p-2">
                  {project.contract_amount != null ? (
                    <span className="font-semibold text-[var(--status-awarded)]">
                      ${Number(project.contract_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground opacity-70">No contract amount yet</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Notes</h4>
              {!editingNotes && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingNotes(true)}>
                  Edit
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add notes here..."
                  className="min-h-[80px] text-sm resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingNotes(false); setNotesValue(project.notes || ""); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => update.mutate(
                      { notes: notesValue },
                      { onSuccess: () => { setEditingNotes(false); toast.success("Notes updated"); } },
                    )}
                    disabled={update.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-background/50 rounded p-2 min-h-[40px] whitespace-pre-wrap">
                {project.notes || <span className="italic opacity-50">No notes</span>}
              </div>
            )}
          </div>

          <AttachmentsSection projectId={project.id} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
