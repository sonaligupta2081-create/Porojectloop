"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { LoopMark } from "@/components/shared/LoopMark";
import { signIn } from "next-auth/react"; // ✨ NEXTAUTH IMPORTED HERE ✨

export function AuthForm({ mode: initialMode }: { mode: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [workspaceName, setWorkspaceName] = useState("Andhra University");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "ANALYST" | "VIEWER">("ADMIN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [helperText, setHelperText] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    // 1. EMPTY FIELDS CHECK
    if (!normalizedEmail || !normalizedPassword) {
      setError("Email and Password fields cannot be empty.");
      setLoading(false);
      return;
    }

    // 2. EMAIL FORMAT CHECK
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError("Please enter a valid email address (e.g., you@company.com).");
      setLoading(false);
      return;
    }

    // 3. PASSWORD & NAME VALIDATION (Only during Signup)
    if (mode === "signup") {
      if (normalizedPassword.length < 8) {
        setError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }
      
      const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/;
      if (!hasNumberOrSpecial.test(normalizedPassword)) {
        setError("Password must contain at least one number or special character.");
        setLoading(false);
        return;
      }

      if (!workspaceName.trim() || !name.trim()) {
        setError("Workspace name and your name are required.");
        setLoading(false);
        return;
      }

      try {
        // 🚀 REAL BACKEND API CALL: SIGNUP
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceName,
            name: name.trim(),
            email: normalizedEmail,
            password: normalizedPassword,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || "Signup failed. Email might already be taken.");
        }

        // Auto-login immediately after successful signup
        const signInRes = await signIn("credentials", {
          email: normalizedEmail,
          password: normalizedPassword,
          redirect: false,
        });

        if (signInRes?.error) {
          throw new Error("Account created, but login failed. Please log in manually.");
        }

        router.push("/dashboard");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
      return;
    }

    // 🚀 REAL BACKEND API CALL: LOGIN
    try {
      const signInRes = await signIn("credentials", {
        email: normalizedEmail,
        password: normalizedPassword,
        redirect: false,
      });

      if (signInRes?.error) {
        setError("Email or password is incorrect.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh(); // Refresh to update server-side session status
    } catch (err: any) {
      setError("Something went wrong with the server. Please try again.");
      setLoading(false);
    }
  }

  const title = "Customer Feedback Intelligence Platform";

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(126,34,206,0.35),transparent_50%)] blur-3xl" />
      <div className="pointer-events-none absolute right-1/2 top-[20%] hidden h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl sm:block" />
      <div className="pointer-events-none absolute left-0 bottom-0 hidden h-72 w-80 rounded-full bg-sky-500/10 blur-3xl sm:block" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="space-y-8 p-8 sm:p-10">
            <div className="max-w-xl space-y-5 text-center mx-auto">
              <div className="flex flex-col items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-300 shadow-[0_20px_60px_-45px_rgba(139,92,246,0.7)]">
                  <LoopMark size={24} />
                </span>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-violet-200/80">WELCOME TO OPENLOOP AI</p>
                  <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</p>
                </div>
              </div>

              <p className="max-w-md text-sm leading-6 text-slate-400 mx-auto">
                {mode === "login"
                  ? "Sign in to manage feedback and access your workspace."
                  : "Create your account to start triaging customer feedback with your team."
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-800 bg-slate-900/85 p-1">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError("");
                    }}
                    className={`rounded-3xl px-4 py-3 text-sm font-medium transition ${mode === m
                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
                      : "text-slate-400 hover:text-slate-100"
                      }`}
                  >
                    {m === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              {mode === "signup" && (
                <>
                  <Field icon={Building2} placeholder="Acme Inc." label="Workspace name" value={workspaceName} onChange={setWorkspaceName} />
                  <Field icon={Mail} placeholder="Your name" label="Your name" value={name} onChange={setName} type="text" />
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-400">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as "ADMIN" | "ANALYST" | "VIEWER")}
                      className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 py-3 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/15"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="ANALYST">Analyst</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                </>
              )}

              <Field icon={Mail} placeholder="you@company.com" label="Work email" value={email} onChange={setEmail} type="email" />
              <Field
                icon={Lock}
                placeholder="••••••••"
                label="Password"
                value={password}
                onChange={setPassword}
                type={showPassword ? "text" : "password"}
                action={
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-100"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {error ? <p className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-60"
              >
                {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create workspace"}
              </button>

              {mode === "login" ? (
                <div className="mt-3 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => setHelperText("Demo reset: use the signup flow to create a new demo account.")}
                    className="font-medium text-violet-300 hover:text-violet-100"
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}

              {helperText ? <p className="text-center text-xs text-slate-500">{helperText}</p> : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  action,
}: {
  icon: typeof Mail;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm text-slate-400">
        <label className="font-medium">{label}</label>
        {label === "Password" ? <span className="text-xs text-slate-500">Minimum 8 characters</span> : null}
      </div>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={
            "w-full rounded-3xl border border-slate-800 bg-slate-900/90 py-3 pl-12 " +
            (action ? "pr-12" : "pr-4") +
            " text-sm text-slate-100 outline-none transition focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/15"
          }
        />
        {action}
      </div>
    </div>
  );
}