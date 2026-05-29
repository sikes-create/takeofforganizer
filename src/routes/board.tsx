import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListFilter, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { ProjectCard } from "@/components/ProjectCard";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listProjects, type Project } from "@/lib/projects.functions";

export const Route = createFileRoute("/board")({
  component: BoardPage,
});

const STATUSES = ["Taking Off", "Bidding", "Not Bidding", "Awarded", "Lost"];

function BoardPage() {
  const navigate = useNavigate();
  const { user, token, mustChangePin, logout } = useAuth();
  const fetchProjects = useServerFn(listProjects);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("bid_due_date:asc");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setChecked(true);
    if (checked && !user) navigate({ to: "/" });
    if (checked && user && mustChangePin) navigate({ to: "/change-pin" });
  }, [user, mustChangePin, navigate, checked]);

  const { data: projectResult, isLoading, error } = useQuery({
    queryKey: ["projects", token],
    enabled: !!token,
    refetchInterval: 4000,
    retry: false,
    queryFn: () => fetchProjects({ data: { token: token! } }),
  });

  const sessionError = projectResult && !projectResult.ok ? projectResult.error : null;
  const projects = projectResult?.ok ? projectResult.projects : [];

  useEffect(() => {
    const msg = sessionError || (error as Error | null)?.message || "";
    if (!msg) return;
    if (/Session (invalid|expired)|Not signed in/i.test(msg)) {
      logout();
      navigate({ to: "/" });
    }
  }, [error, logout, navigate, sessionError]);

  const filtered = useMemo(() => {
    let list: Project[] = projects || [];
    if (debounced) {
      const s = debounced.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(s) || (p.notes || "").toLowerCase().includes(s),
      );
    }
    const [field, dir] = sortBy.split(":") as [keyof Project, "asc" | "desc"];
    list = [...list].sort((a, b) => {
      const av = a[field] ?? "";
      const bv = b[field] ?? "";
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [projects, debounced, sortBy]);

  const stats = useMemo(() => {
    const out = { total: 0, takingOff: 0, bidding: 0, notBidding: 0, awarded: 0, lost: 0 };
    (projects || []).forEach((p) => {
      out.total++;
      if (p.status === "Taking Off") out.takingOff++;
      else if (p.status === "Bidding") out.bidding++;
      else if (p.status === "Not Bidding") out.notBidding++;
      else if (p.status === "Awarded") out.awarded++;
      else if (p.status === "Lost") out.lost++;
    });
    return out;
  }, [projects]);

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = filtered.filter((p) => p.status === s);
    return acc;
  }, {} as Record<string, Project[]>);

  if (!user) return null;

  return (
    <Layout>
      <div className="flex-1 flex flex-col h-full p-4 sm:p-6 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Taking Off" value={stats.takingOff} color="var(--status-taking-off)" />
          <StatCard label="Bidding" value={stats.bidding} color="var(--status-bidding)" />
          <StatCard label="Not Bidding" value={stats.notBidding} color="var(--status-not-bidding)" hideOnMobile="md" />
          <StatCard label="Awarded" value={stats.awarded} color="var(--status-awarded)" hideOnMobile="sm" />
          <StatCard label="Lost" value={stats.lost} color="var(--status-lost)" hideOnMobile="md" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between bg-card border border-border p-3 rounded-lg shadow-sm">
          <div className="flex-1 flex gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 max-w-sm min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground hidden lg:block" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bid_due_date:asc">Due Date (Earliest)</SelectItem>
                  <SelectItem value="bid_due_date:desc">Due Date (Latest)</SelectItem>
                  <SelectItem value="created_at:desc">Newest First</SelectItem>
                  <SelectItem value="name:asc">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full sm:w-auto flex justify-end">
            <CreateProjectDialog />
          </div>
        </div>

        <div className="flex-1 flex overflow-x-auto pb-4 gap-4 snap-x">
          {STATUSES.map((status) => {
            if (statusFilter !== "all" && statusFilter !== status) return null;
            const items = grouped[status] || [];
            return (
              <div key={status} className="flex flex-col min-w-[320px] max-w-[320px] w-full snap-start">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{status}</h2>
                  <span className="bg-secondary text-secondary-foreground text-xs py-0.5 px-2 rounded-full font-medium">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-1">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex justify-between pt-2">
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    ))
                  ) : items.length > 0 ? (
                    items.map((p) => <ProjectCard key={p.id} project={p} />)
                  ) : (
                    <div className="flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground italic">
                      No projects
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  label, value, color, hideOnMobile,
}: { label: string; value: number; color?: string; hideOnMobile?: "sm" | "md" }) {
  const hide = hideOnMobile === "sm" ? "hidden sm:flex" : hideOnMobile === "md" ? "hidden md:flex" : "flex";
  const style = color
    ? ({
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        color,
      } as React.CSSProperties)
    : undefined;
  return (
    <div className={`${hide} flex-col rounded-lg border p-3 shadow-sm ${color ? "" : "bg-card border-border"}`} style={style}>
      <span className="text-xs font-medium uppercase tracking-wider mb-1 opacity-90">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
