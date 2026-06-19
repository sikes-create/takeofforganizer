import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileSignature, HardHat, LayoutGrid, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { logout as logoutFn } from "@/lib/auth.functions";

export function Layout({ children }: { children: ReactNode }) {
  const { user, token, logout } = useAuth();
  const serverLogout = useServerFn(logoutFn);
  const onLogout = async () => {
    try {
      if (token) await serverLogout({ data: { token } });
    } catch {
      // ignore — local sign-out below still happens
    }
    logout();
  };
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-md">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <Link to="/" className="font-bold text-xl tracking-tight">
              Custom Fence LLC Hub
            </Link>
          </div>
          {user && (
            <div className="flex items-center gap-2 sm:gap-4">
              <nav className="flex items-center gap-1">
                <Link
                  to="/board"
                  className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent flex items-center gap-1.5 [&.active]:bg-accent [&.active]:text-foreground text-muted-foreground"
                  activeOptions={{ exact: true }}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Board</span>
                </Link>
                <Link
                  to="/contracts"
                  className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent flex items-center gap-1.5 [&.active]:bg-accent [&.active]:text-foreground text-muted-foreground"
                >
                  <FileSignature className="h-4 w-4" />
                  <span className="hidden sm:inline">Contracts</span>
                </Link>
              </nav>
              <div className="text-sm text-muted-foreground hidden sm:block">
                Signed in as <span className="text-foreground font-medium">{user}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}