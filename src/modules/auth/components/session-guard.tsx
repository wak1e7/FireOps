"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SESSION_INACTIVITY_LOCK_MS } from "@/lib/session-policy-shared";
import { loginWithFirefighterCode } from "@/modules/auth/services/auth-service";
import { createClient } from "@/utils/supabase/client";

const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
const lastActivityKey = "fireops-last-activity-at";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    function markActivity() {
      if (lockRef.current) return;
      window.localStorage.setItem(lastActivityKey, String(Date.now()));
    }

    function checkSession() {
      const lastActivity = Number(window.localStorage.getItem(lastActivityKey) ?? Date.now());
      if (Date.now() - lastActivity >= SESSION_INACTIVITY_LOCK_MS) {
        lockRef.current = true;
        setLocked(true);
      }
    }

    async function verifyPolicy() {
      const response = await fetch("/api/auth/session-policy", { cache: "no-store" });
      if (response.status === 401) {
        await createClient().auth.signOut();
        router.replace("/login");
      }
    }

    if (!window.localStorage.getItem(lastActivityKey)) markActivity();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    const timer = window.setInterval(checkSession, 30_000);
    verifyPolicy();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.clearInterval(timer);
    };
  }, [router]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const code = window.localStorage.getItem("fireops-demo-session") ?? "";
    const result = await loginWithFirefighterCode(code, password);
    setLoading(false);

    if (!result.ok) {
      setError("No se pudo reabrir la sesión.");
      return;
    }

    window.localStorage.setItem(lastActivityKey, String(Date.now()));
    setPassword("");
    lockRef.current = false;
    setLocked(false);
  }

  return (
    <>
      {children}
      {locked ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#020617]/88 p-4 backdrop-blur-md">
          <form className="glass-panel w-full max-w-sm rounded-3xl p-6 text-white" onSubmit={unlock}>
            <div className="mb-5 flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-fire-red/18 text-red-100">
                <LockKeyhole className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-black">Sesión bloqueada</h2>
                <p className="mt-1 text-sm leading-5 text-white/58">
                  Reabre tu sesión rápida. Tu estado operativo no se modificó.
                </p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Contraseña</span>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="font-semibold"
                autoFocus
                required
              />
            </label>

            {error ? <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/12 px-4 py-3 text-sm">{error}</p> : null}

            <Button type="submit" className="mt-5 h-12 w-full" disabled={loading}>
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Validando..." : "Reabrir sesión"}
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
