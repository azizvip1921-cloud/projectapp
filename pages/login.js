import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ShieldCheck, Eye, EyeOff, User, Lock, LogIn } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("HSD");

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("hr_auth") === "1") {
      router.replace("/");
    }
    try {
      const saved = localStorage.getItem("company_info");
      if (saved) {
        const info = JSON.parse(saved);
        if (info.name) setCompanyName(info.name);
      }
    } catch {}
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        localStorage.setItem("hr_auth", "1");
        localStorage.setItem("hr_user", JSON.stringify(json.user));
        router.replace("/");
      } else {
        if (json.error === "not_found") {
          setError(
            t.login_error_not_found ||
            (t.login_error || "Invalid username or password")
          );
        } else if (json.error === "wrong_password") {
          setError(t.login_error || "Invalid username or password");
        } else {
          setError(t.login_error || "Invalid username or password");
        }
      }
    } catch {
      setError(t.login_error || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-bubble">
            <ShieldCheck width={36} height={36} stroke="white" />
          </div>
          <h1 className="login-title">{companyName}</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          {/* Username */}
          <div className="login-field">
            <label className="login-label">{t.login_username || "Username"}</label>
            <div className="login-input-wrap">
              <span className="login-input-icon login-input-icon--left">
                <User width={15} height={15} />
              </span>
              <input
                type="text"
                className="login-input login-input--has-icon"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label">{t.login_password || "Password"}</label>
            <div className="login-input-wrap">
              <span className="login-input-icon login-input-icon--left">
                <Lock width={15} height={15} />
              </span>
              <input
                type={showPass ? "text" : "password"}
                className="login-input login-input--has-icon login-input--has-icon-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
              >
                {showPass
                  ? <EyeOff width={16} height={16} />
                  : <Eye     width={16} height={16} />}
              </button>
            </div>
          </div>

          {/* Hint */}
          <p className="login-hint">
            {t.login_hint || "Enter your email or full name and password to sign in."}
          </p>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            <span>{loading ? "..." : (t.login_btn || "Sign In")}</span>
            {!loading && <LogIn width={16} height={16} className="login-btn-icon" />}
          </button>
        </form>
      </div>
    </div>
  );
}
