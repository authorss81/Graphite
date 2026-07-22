import { useState, type FormEvent } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { isAuthConfigured } from "../utils/auth";
import { toast } from "./Toast";

export function AuthScreen() {
  const { login, register, authLoading, authError, isInitializing, clearError } =
    useAuthStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (isInitializing) {
    return <div className="auth-loading"><div className="auth-loading-spinner" /></div>;
  }

  if (!isAuthConfigured()) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="auth-brand">Graphite Studio</h1>
          <p className="auth-error">Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email.trim()) {
      toast("Please enter your email", "error");
      return;
    }
    if (password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      if (mode === "login") {
        await login(email, password);
        toast("Welcome back!", "success");
      } else {
        await register(email, password);
        toast("Account created! Check your email to confirm.", "success");
      }
    } catch {
      // error is set in store
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    clearError();
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">Graphite Studio</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {authError && <p className="auth-error">{authError}</p>}

          <button className="auth-submit" type="submit" disabled={authLoading}>
            {authLoading
              ? "Please wait…"
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button className="auth-link" onClick={toggleMode}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="auth-link" onClick={toggleMode}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
