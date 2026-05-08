import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { HardHat, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { changePin } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/change-pin")({
  component: ChangePinPage,
});

function ChangePinPage() {
  const navigate = useNavigate();
  const { user, token, clearMustChange } = useAuth();
  const change = useServerFn(changePin);

  const [pin1, setPin1] = useState(["", "", "", ""]);
  const [pin2, setPin2] = useState(["", "", "", ""]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const refs1 = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const refs2 = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (!token) navigate({ to: "/" });
  }, [token, navigate]);

  const handle = (
    arr: string[],
    setArr: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement | null>[],
    i: number,
    v: string,
  ) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...arr];
    next[i] = d;
    setArr(next);
    setErr("");
    if (d && i < 3) refs[i + 1].current?.focus();
  };

  const submit = async () => {
    const a = pin1.join("");
    const b = pin2.join("");
    if (a.length !== 4) return setErr("Enter a 4-digit PIN");
    if (a !== b) return setErr("PINs do not match");
    if (!token) return setErr("Session expired");
    setSaving(true);
    try {
      const res = await change({ data: { token, newPin: a } });
      if (res.ok) {
        clearMustChange();
        setDone(true);
        setTimeout(() => navigate({ to: "/board" }), 800);
      } else {
        setErr(res.error || "Could not save PIN");
      }
    } catch (e) {
      setErr((e as Error).message || "Could not save PIN");
    } finally {
      setSaving(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto bg-primary p-3 rounded-md w-fit">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Set your PIN</CardTitle>
          <CardDescription>
            Welcome{user ? `, ${user}` : ""}. Pick a new 4-digit PIN you'll use to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">New PIN</label>
            <div className="flex justify-center gap-2">
              {pin1.map((d, i) => (
                <Input
                  key={i}
                  ref={refs1[i]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handle(pin1, setPin1, refs1, i, e.target.value)}
                  className="h-14 w-12 text-center text-2xl"
                  disabled={saving || done}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm PIN</label>
            <div className="flex justify-center gap-2">
              {pin2.map((d, i) => (
                <Input
                  key={i}
                  ref={refs2[i]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handle(pin2, setPin2, refs2, i, e.target.value)}
                  className="h-14 w-12 text-center text-2xl"
                  disabled={saving || done}
                />
              ))}
            </div>
          </div>
          {err && <p className="text-sm text-destructive text-center">{err}</p>}
          {done ? (
            <div className="flex items-center justify-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" /> PIN saved
            </div>
          ) : (
            <Button className="w-full" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save PIN
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
