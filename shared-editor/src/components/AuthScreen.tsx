import { useState, type FormEvent } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { isAuthConfigured, resetPasswordForEmail } from "../utils/auth";
import { toast } from "./Toast";

export function AuthScreen() {
  const { login, register, authLoading, authError, isInitializing, clearError } =
    useAuthStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);

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
        setPassword("");
        toast("Welcome back!", "success");
      } else {
        await register(email, password);
        setPassword("");
        setSuccessMessage("Account created! A confirmation link has been sent to your email. Please check your inbox and confirm your email before signing in.");
        toast("Confirmation email sent!", "success");
      }
    } catch {
      setPassword("");
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    clearError();
    setSuccessMessage(null);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">Graphite Studio</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>

        {successMessage ? (
          <div className="auth-success-box" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "12px 16px", margin: "16px 0", color: "#34d399", fontSize: "14px", lineHeight: "1.5" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "18px", lineHeight: 1 }}>✓</span>
              <div>{successMessage}</div>
            </div>
            <button className="auth-link" onClick={() => setSuccessMessage(null)} style={{ marginTop: "12px", display: "block" }}>
              Dismiss
            </button>
          </div>
        ) : null}

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
              <br />
              <button
                className="auth-link"
                style={{ marginTop: "8px", fontSize: "12px" }}
                onClick={async () => {
                  if (!email) {
                    toast("Please enter your email address first", "error");
                    return;
                  }
                  try {
                    clearError();
                    setSuccessMessage(null);
                    await resetPasswordForEmail(email);
                    setSuccessMessage("Password reset link sent! Please check your email inbox and spam folders for the recovery link.");
                    toast("Password reset email sent!", "success");
                  } catch (err: unknown) {
                    toast(err instanceof Error ? err.message : "Reset failed", "error");
                  }
                }}
              >
                Forgot password?
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
