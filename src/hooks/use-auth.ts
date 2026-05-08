import { useEffect, useState } from "react";

const KEY = "fence_user";

export function useAuth() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    setUser(typeof window !== "undefined" ? localStorage.getItem(KEY) : null);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setUser(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = (name: string) => {
    localStorage.setItem(KEY, name);
    setUser(name);
  };
  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(null);
  };

  return { user, login, logout };
}