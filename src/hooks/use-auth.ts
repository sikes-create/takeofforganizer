import { useEffect, useState, useCallback } from "react";

const KEY = "fence_auth";

type Auth = { name: string; token: string; mustChangePin: boolean };

function read(): Auth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Auth) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    setAuth(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setAuth(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback((a: Auth) => {
    localStorage.setItem(KEY, JSON.stringify(a));
    setAuth(a);
  }, []);

  const clearMustChange = useCallback(() => {
    setAuth((prev) => {
      if (!prev) return prev;
      const next = { ...prev, mustChangePin: false };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setAuth(null);
  }, []);

  return {
    auth,
    user: auth?.name ?? null,
    token: auth?.token ?? null,
    mustChangePin: auth?.mustChangePin ?? false,
    login,
    logout,
    clearMustChange,
  };
}
