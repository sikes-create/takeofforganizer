import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, HardHat, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { verifyPin } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const verify = useServerFn(verifyPin);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["app_users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_user_names").select("id, name").order("id");
      if (error) throw error;
      return data as Array<{ id: number; name: string }>;
    },
  });

  const [selected, setSelected] = useState("");
  const [step, setStep] = useState<"select" | "pin">("select");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (user) navigate({ to: "/board" });
  }, [user, navigate]);

  useEffect(() => {
    if (step === "pin") setTimeout(() => refs[0].current?.focus(), 50);
  }, [step]);

  const submit = async (full: string) => {
    setVerifying(true);
    setPinError("");
    try {
      const result = await verify({ data: { name: selected, pin: full } });
      if (result.ok) {
        login(selected);
        navigate({ to: "/board" });
      } else {
        setPinError(result.error || "Incorrect PIN");
        setPin(["", "", "", ""]);
        setTimeout(() => refs[0].current?.focus(), 50);
      }
    } catch {
      setPinError("Verification failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const onPinChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[i] = d;
    setPin(next);
    setPinError("");
    if (d && i < 3) refs[i + 1].current?.focus();
    if (d && i === 3) {
      const full = next.join("");
      if (full.length === 4) submit(full);
    }
  };

  const onPinKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[i] && i > 0) refs[i - 1].current?.focus();
    if (e.key === "Enter") {
      const full = pin.join("");
      if (full.length === 4) submit(full);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (p.length === 4) {
      setPin(p.split(""));
      submit(p);
    }
    e.preventDefault();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto bg-primary p-3 rounded-md w-fit">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Takeoff Tracker</CardTitle>
          <CardDescription>
            {step === "select" ? "Select your name to sign in" : `Enter PIN for ${selected}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Failed to load users
            </div>
          )}

          {step === "select" ? (
            <>
              <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading..." : "Pick a user"} />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" disabled={!selected} onClick={() => setStep("pin")}>
                Continue
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Default PINs: Boss 1111 · Estimator 1 2222 · Estimator 2 3333
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center gap-2" onPaste={onPaste}>
                {pin.map((d, i) => (
                  <Input
                    key={i}
                    ref={refs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => onPinChange(i, e.target.value)}
                    onKeyDown={(e) => onPinKey(i, e)}
                    className="h-14 w-12 text-center text-2xl"
                    disabled={verifying}
                  />
                ))}
              </div>
              {pinError && (
                <p className="text-sm text-destructive text-center">{pinError}</p>
              )}
              {verifying && (
                <div className="flex justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("select");
                  setPin(["", "", "", ""]);
                  setPinError("");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
