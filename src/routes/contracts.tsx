import { useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, parseISO } from "date-fns";
import { FileSignature } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { listProjects, type Project } from "@/lib/projects.functions";

export const Route = createFileRoute("/contracts")({
  component: ContractsPage,
});

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function ContractsPage() {
  const navigate = useNavigate();
  const { user, token, mustChangePin, logout } = useAuth();
  const fetchProjects = useServerFn(listProjects);

  useEffect(() => {
    if (!user) navigate({ to: "/" });
    else if (mustChangePin) navigate({ to: "/change-pin" });
  }, [user, mustChangePin, navigate]);

  const { data: projectResult, isLoading, error } = useQuery({
    queryKey: ["projects", token],
    enabled: !!token,
    retry: false,
    queryFn: () => fetchProjects({ data: { token: token! } }),
  });

  const sessionError = projectResult && !projectResult.ok ? projectResult.error : null;
  const projects: Project[] = projectResult?.ok ? projectResult.projects : [];

  useEffect(() => {
    const msg = sessionError || (error as Error | null)?.message || "";
    if (!msg) return;
    if (/Session (invalid|expired)|Not signed in/i.test(msg)) {
      logout();
      navigate({ to: "/" });
    }
  }, [error, logout, navigate, sessionError]);

  const contracts = useMemo(
    () =>
      projects
        .filter((p) => p.status === "Awarded" && p.contract_amount != null)
        .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1)),
    [projects],
  );

  const totalAmount = useMemo(
    () => contracts.reduce((s, p) => s + Number(p.contract_amount || 0), 0),
    [contracts],
  );
  const awardedNoAmount = projects.filter(
    (p) => p.status === "Awarded" && p.contract_amount == null,
  ).length;

  if (!user) return null;

  return (
    <Layout>
      <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-md">
            <FileSignature className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
            <p className="text-sm text-muted-foreground">Signed contracts from awarded jobs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Contracts</div>
            <div className="text-3xl font-bold">{contracts.length}</div>
          </div>
          <div className="rounded-lg border p-4 shadow-sm" style={{
            backgroundColor: "color-mix(in oklab, var(--status-awarded) 12%, transparent)",
            borderColor: "color-mix(in oklab, var(--status-awarded) 35%, transparent)",
            color: "var(--status-awarded)",
          }}>
            <div className="text-xs font-medium uppercase tracking-wider mb-1 opacity-90">Total Value</div>
            <div className="text-3xl font-bold">{fmt(totalAmount)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Awarded, No Amount</div>
            <div className="text-3xl font-bold">{awardedNoAmount}</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-6">Project</div>
            <div className="col-span-3">Signed</div>
            <div className="col-span-3 text-right">Amount</div>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No contracts yet. Mark a project as <span className="font-semibold">Awarded</span> and add its contract amount to see it here.
            </div>
          ) : (
            contracts.map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 items-center hover:bg-accent/40">
                <div className="col-span-6">
                  <div className="font-semibold">{p.name}</div>
                  {p.claimed_by && (
                    <div className="text-xs text-muted-foreground">Signed by {p.claimed_by}</div>
                  )}
                </div>
                <div className="col-span-3 text-sm text-muted-foreground">
                  {format(parseISO(p.updated_at), "MMM d, yyyy")}
                </div>
                <div className="col-span-3 text-right font-semibold tabular-nums" style={{ color: "var(--status-awarded)" }}>
                  {fmt(Number(p.contract_amount || 0))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}